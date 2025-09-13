import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

interface JwtUser {
  userId: string;
  deviceId: string;
  phone: string;
}

@Controller("chats")
@UseGuards(JwtAuthGuard) // ✅ all routes protected
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async createChat(
    @Request() req: { user: JwtUser },
    @Body() body: { title: string; isGroup?: boolean },
  ) {
    const chat = await this.chatService.createRoom(body.title, req.user, body.isGroup);
    return { message: "Chat created successfully", data: chat };
  }

  @Post(":chatId/join")
  async joinChat(
    @Request() req: { user: JwtUser },
    @Param("chatId") chatId: string,
  ) {
    const participant = await this.chatService.joinRoom(chatId, req.user);
    return { message: "User joined chat successfully", data: participant };
  }

  @Get()
  async getMyChats(
    @Request() req: { user: JwtUser },
    @Query("page") page = "1",
    @Query("limit") limit = "10",
    @Query("search") search?: string,
  ) {
    const result = await this.chatService.getChatsForUser(
      req.user,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
    );
    return {
      message: "Chats fetched successfully",
      data: result.chats,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Post(":chatId/messages")
  async sendMessage(
    @Request() req: { user: JwtUser },
    @Param("chatId") chatId: string,
    @Body() body: { content: string },
  ) {
    const msg = await this.chatService.saveMessage(chatId, req.user, body.content);
    return { message: "Message sent successfully", data: msg };
  }
}
