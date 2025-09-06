import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/Prisma.service';
import { ChatController } from './chat.controller';

@Module({
  providers: [ChatGateway, ChatService, PrismaService],
  exports: [ChatService], // export if needed in other modules
  controllers: [ChatController],
})
export class ChatModule {}
