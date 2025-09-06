import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/Prisma.service';

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
    });
  }

  async getMessages(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
