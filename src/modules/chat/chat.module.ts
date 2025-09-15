import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/Prisma.service';
import { ChatController } from './chat.controller';
import { RedisModule } from '../../redis/redis.module'; // ✅ fixed path

@Module({
  imports: [RedisModule],
  providers: [ChatGateway, ChatService, PrismaService],
  exports: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
