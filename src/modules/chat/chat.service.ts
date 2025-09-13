import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/Prisma.service";
import { Prisma } from "@prisma/client";
import { JwtUser } from "../../types/jwt-user";
import { Response } from "express";
import { join } from "path";
import { existsSync, createReadStream } from "fs";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // --- TRACK TYPING USERS (IN MEMORY) ---
  // key = chatId, value = Set of userIds currently typing
  private typingUsersMap: Map<string, Set<string>> = new Map();

  setUserTyping(chatId: string, userId: string) {
    if (!this.typingUsersMap.has(chatId)) {
      this.typingUsersMap.set(chatId, new Set());
    }
    this.typingUsersMap.get(chatId)!.add(userId);
  }

  removeUserTyping(chatId: string, userId: string) {
    if (this.typingUsersMap.has(chatId)) {
      this.typingUsersMap.get(chatId)!.delete(userId);
      if (this.typingUsersMap.get(chatId)!.size === 0) {
        this.typingUsersMap.delete(chatId);
      }
    }
  }

  getTypingUsers(chatId: string) {
    return Array.from(this.typingUsersMap.get(chatId) || []);
  }

  // --- DEVICE CHECK ---
  private async validateDevice(user: JwtUser) {
    const device = await this.prisma.device.findFirst({
      where: { userId: user.userId, deviceId: user.deviceId },
    });

    if (!device) {
      throw new UnauthorizedException(
        "Invalid session. Logged in on another device."
      );
    }
  }

  // --- CREATE ROOM ---
  async createRoom(title: string, user: JwtUser, isGroup = false) {
    await this.validateDevice(user);

    const creator = await this.prisma.user.findUnique({
      where: { id: user.userId },
    });
    if (!creator) throw new NotFoundException(`User not found`);

    const chat = await this.prisma.chat.create({
      data: { title, createdBy: user.userId, isGroup },
    });

    await this.joinRoom(chat.id, user);

    return chat;
  }

  // --- JOIN ROOM ---
  async joinRoom(chatId: string, user: JwtUser) {
    await this.validateDevice(user);

    const existing = await this.prisma.chatParticipant.findFirst({
      where: { chatId, userId: user.userId },
    });

    if (!existing) {
      return this.prisma.chatParticipant.create({
        data: { chatId, userId: user.userId },
      });
    }
    return existing;
  }

  // --- SAVE MESSAGE ---
  async saveMessage(
    chatId: string,
    user: JwtUser,
    content?: string | null,
    media?: { mediaUrl: string; mediaType: string }
  ) {
    await this.validateDevice(user);

    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException("Chat not found");

    return this.prisma.message.create({
      data: {
        chatId,
        senderId: user.userId,
        content: content ?? null,
        mediaUrl: media?.mediaUrl ?? null,
        mediaType: media?.mediaType ?? null,
        contentType: media ? "media" : "text",
      },
      include: { sender: true },
    });
  }

  // --- GET CHATS FOR USER ---
  async getChatsForUser(user: JwtUser, page = 1, limit = 10, search?: string) {
    await this.validateDevice(user);

    const skip = (page - 1) * limit;

    const searchCondition: Prisma.ChatWhereInput = search
      ? {
          OR: [
            { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
            {
              participants: {
                some: {
                  user: {
                    name: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                },
              },
            },
          ],
        }
      : {};

    const chats = await this.prisma.chat.findMany({
      where: {
        participants: { some: { userId: user.userId } },
        ...searchCondition,
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, phone: true } } },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { sender: { select: { id: true, name: true } } },
        },
      },
      skip,
      take: limit,
    });

    const total = await this.prisma.chat.count({
      where: {
        participants: { some: { userId: user.userId } },
        ...searchCondition,
      },
    });

    const formattedChats = chats.map((chat) => {
      const otherParticipants = chat.participants
        .map((p) => p.user)
        .filter((u) => u.id !== user.userId);
      const chatName = chat.isGroup
        ? chat.title
        : otherParticipants[0]?.name || "Unknown";

      const lastMessage = chat.messages[0]
        ? {
            id: chat.messages[0].id,
            content: chat.messages[0].content,
            createdAt: chat.messages[0].createdAt,
            sender: chat.messages[0].sender,
            mediaUrl: chat.messages[0].mediaUrl ?? null,
            mediaType: chat.messages[0].mediaType ?? null,
          }
        : null;

      return {
        id: chat.id,
        title: chat.title,
        chatName,
        isGroup: chat.isGroup,
        createdBy: chat.createdBy,
        createdAt: chat.createdAt,
        participants: otherParticipants,
        lastMessage,
      };
    });

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      chats: formattedChats.sort((a, b) => {
        const aTime = a.lastMessage
          ? new Date(a.lastMessage.createdAt).getTime()
          : new Date(a.createdAt).getTime();
        const bTime = b.lastMessage
          ? new Date(b.lastMessage.createdAt).getTime()
          : new Date(b.createdAt).getTime();
        return bTime - aTime;
      }),
    };
  }

  // --- DOWNLOAD MEDIA WITH TRACKING ---
  async downloadMedia(
    chatId: string,
    messageId: string,
    user: JwtUser,
    res: Response
  ) {
    await this.validateDevice(user);

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, chatId },
    });

    if (!message || !message.mediaUrl)
      throw new NotFoundException("Media not found");

    await this.prisma.mediaDownload.create({
      data: { messageId, userId: user.userId },
    });

    const fileName = message.mediaUrl.split("/").pop()!;
    const filePath = join(process.cwd(), "uploads", fileName);

    if (!existsSync(filePath))
      throw new NotFoundException("File not found on server");

    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    if (["jpg", "jpeg", "png", "gif", "mp4", "webm"].includes(ext)) {
      res.setHeader("Content-Disposition", "inline");
    } else {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
    }

    return createReadStream(filePath).pipe(res);
  }

  // --- GET CHAT HISTORY ---
  async getChatHistory(chatId: string) {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, name: true } } },
    });
    return messages;
  }
}
