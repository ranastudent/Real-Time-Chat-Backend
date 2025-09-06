import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/Prisma.service';

@Module({
  providers: [ChatGateway, ChatService, PrismaService],
  exports: [ChatService], // export if needed in other modules
})
export class ChatModule {}
