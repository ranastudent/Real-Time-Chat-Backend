import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/Prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // --- ROOM MANAGEMENT ---

  async createRoom(title: string, createdBy: string, isGroup = false) {
    // Ensure creator exists
    const creator = await this.prisma.user.findUnique({
      where: { id: createdBy },
    });
    if (!creator) {
      throw new NotFoundException(`User with id ${createdBy} not found`);
    }

    return this.prisma.chat.create({
      data: { title, createdBy, isGroup },
    });
  }

  async joinRoom(chatId: string, userId: string) {
    // Ensure user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Ensure chat exists
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      throw new NotFoundException(`Chat with id ${chatId} not found`);
    }

    // Check if already joined
    const existing = await this.prisma.chatParticipant.findFirst({
      where: { chatId, userId },
    });

    if (!existing) {
      return this.prisma.chatParticipant.create({
        data: { chatId, userId },
      });
    }

    return existing;
  }

  async getUserChats(userId: string) {
    return this.prisma.chatParticipant.findMany({
      where: { userId },
      include: { chat: true },
    });
  }

  // --- MESSAGES ---

  async saveMessage(chatId: string, senderId: string, content: string) {
    // Ensure chat exists
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      throw new NotFoundException(`Chat with id ${chatId} not found`);
    }

    // Ensure sender exists
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
    });
    if (!sender) {
      throw new NotFoundException(`User with id ${senderId} not found`);
    }

    return this.prisma.message.create({
      data: { chatId, senderId, content },
      include: { sender: true },
    });
  }

  async getChatHistory(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      include: { sender: true },
    });
  }

  async getMessages(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      include: {
        sender: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async getMessagesPaginated(chatId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      include: {
        sender: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    });

    const total = await this.prisma.message.count({ where: { chatId } });

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      messages,
    };
  }
  async getParticipants(chatId: string) {
    return this.prisma.chatParticipant.findMany({
      where: { chatId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });
  }

 async getChatsForUser(
  userId: string,
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const skip = (page - 1) * limit;

  // Search filter
  const searchCondition: Prisma.ChatWhereInput = search
    ? {
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          {
            participants: {
              some: {
                user: {
                  name: { contains: search, mode: Prisma.QueryMode.insensitive },
                },
              },
            },
          },
        ],
      }
    : {};

  // Fetch chats for this user
  const chats = await this.prisma.chat.findMany({
    where: {
      participants: { some: { userId } },
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
      participants: { some: { userId } },
      ...searchCondition,
    },
  });

  // Format response
  const formattedChats = chats.map((chat) => {
    // Get other participants (exclude current user)
    const otherParticipants = chat.participants
      .map((p) => p.user)
      .filter((u) => u.id !== userId);

    // Determine chat name
    const chatName = chat.isGroup
      ? chat.title
      : otherParticipants[0]?.name || "Unknown";

    return {
      id: chat.id,
      title: chat.title,
      chatName, // WhatsApp-style display name
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

  // Order by last message time
  const sortedChats = formattedChats.sort((a, b) => {
    const aTime = a.lastMessage
      ? new Date(a.lastMessage.createdAt).getTime()
      : new Date(a.createdAt).getTime();
    const bTime = b.lastMessage
      ? new Date(b.lastMessage.createdAt).getTime()
      : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    chats: sortedChats,
  };
}

}
