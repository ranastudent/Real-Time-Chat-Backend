import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/Prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // --- DEVICE CHECK (based on JWT) ---
  private async validateDevice(userId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { userId, deviceId },
    });

    if (!device) {
      throw new UnauthorizedException(
        "Invalid session. Logged in on another device."
      );
    }
  }

  // --- ROOM MANAGEMENT ---
  async createRoom(title: string, user: { userId: string; deviceId: string }, isGroup = false) {
    await this.validateDevice(user.userId, user.deviceId);

    const creator = await this.prisma.user.findUnique({ where: { id: user.userId } });
    if (!creator) throw new NotFoundException(`User not found`);

    const chat = await this.prisma.chat.create({
      data: { title, createdBy: user.userId, isGroup },
    });

    // Auto add creator
    await this.joinRoom(chat.id, user);

    return chat;
  }

  async joinRoom(chatId: string, user: { userId: string; deviceId: string }) {
    await this.validateDevice(user.userId, user.deviceId);

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

  // --- MESSAGES ---
  async saveMessage(chatId: string, user: { userId: string; deviceId: string }, content: string) {
    await this.validateDevice(user.userId, user.deviceId);

    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new NotFoundException("Chat not found");

    return this.prisma.message.create({
      data: { chatId, senderId: user.userId, content },
      include: { sender: true },
    });
  }

  // --- GET CHATS ---
  async getChatsForUser(
    user: { userId: string; deviceId: string },
    page = 1,
    limit = 10,
    search?: string
  ) {
    await this.validateDevice(user.userId, user.deviceId);

    const skip = (page - 1) * limit;

    const searchCondition: Prisma.ChatWhereInput = search
      ? {
          OR: [
            { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
            {
              participants: {
                some: {
                  user: { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
                },
              },
            },
          ],
        }
      : {};

    const chats = await this.prisma.chat.findMany({
      where: { participants: { some: { userId: user.userId } }, ...searchCondition },
      include: {
        participants: { include: { user: { select: { id: true, name: true, phone: true } } } },
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
      where: { participants: { some: { userId: user.userId } }, ...searchCondition },
    });

    const formattedChats = chats.map(chat => {
      const otherParticipants = chat.participants.map(p => p.user).filter(u => u.id !== user.userId);
      const chatName = chat.isGroup ? chat.title : otherParticipants[0]?.name || "Unknown";

      return {
        id: chat.id,
        title: chat.title,
        chatName,
        isGroup: chat.isGroup,
        createdBy: chat.createdBy,
        createdAt: chat.createdAt,
        participants: otherParticipants,
        lastMessage: chat.messages[0]
          ? {
              id: chat.messages[0].id,
              content: chat.messages[0].content,
              createdAt: chat.messages[0].createdAt,
              sender: chat.messages[0].sender,
            }
          : null,
      };
    });

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      chats: formattedChats.sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      }),
    };
  }
}
