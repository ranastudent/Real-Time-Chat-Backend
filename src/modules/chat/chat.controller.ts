// src/modules/chat/chat.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // GET /chats/:chatId/messages?page=1&limit=20
  @Get(':chatId/messages')
  async getMessages(
    @Param('chatId') chatId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    return this.chatService.getMessagesPaginated(chatId, pageNum, limitNum);
  }
}
