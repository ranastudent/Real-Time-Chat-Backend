import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/Prisma.service";

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(chatId: string, senderId: string, content: string) {
    return this.prisma.message.create({
      data: {
        chatId,
        senderId,
        content,
      },
      include: {
        sender: true,
      },
    });
  }

  async getChatHistory(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: true,
      },
    });
  }

  async getMessages(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

   async getMessagesPaginated(chatId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });

    const total = await this.prisma.message.count({
      where: { chatId },
    });

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      messages,
    };
  }
}
