import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/Prisma.service";

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


async getAllChats() {
  // Fetch all chats with participants and last message
  const chats = await this.prisma.chat.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      messages: {
        take: 1, // Only the latest message
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Format chats with lastMessage
  return chats.map(chat => ({
    id: chat.id,
    title: chat.title,
    isGroup: chat.isGroup,
    createdBy: chat.createdBy,
    createdAt: chat.createdAt,
    participants: chat.participants.map(p => p.user),
    lastMessage: chat.messages[0] || null, // If no messages, set null
  }));
}

}
