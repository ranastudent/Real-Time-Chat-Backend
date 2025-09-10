// src/modules/chat/chat.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { ChatService } from "./chat.service";

@Controller("chats")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // --- ROOM (CHAT) MANAGEMENT ---

  // Create a new chat
  @Post()
  async createChat(
    @Body() body: { title: string; createdBy: string; isGroup?: boolean }
  ) {
    const chat = await this.chatService.createRoom(
      body.title,
      body.createdBy,
      body.isGroup
    );

    // auto add creator as owner
    await this.chatService.joinRoom(chat.id, body.createdBy);
    return {
      message: "Chat created successfully",
      data: chat,
    };
  }

  // Join an existing chat
  @Post(":chatId/join")
  async joinChat(
    @Param("chatId") chatId: string,
    @Body() body: { userId: string }
  ) {
    const participant = await this.chatService.joinRoom(chatId, body.userId);
    return {
      message: "User joined chat successfully",
      data: participant,
    };
  }

  // Get all chats for a user
  @Get("user/:userId")
  async getUserChats(@Param("userId") userId: string) {
    const chats = await this.chatService.getUserChats(userId);
    return {
      message: "User chats fetched successfully",
      data: chats,
    };
  }

  // Get participants of a chat
  @Get(":chatId/participants")
  async getParticipants(@Param("chatId") chatId: string) {
    const participants = await this.chatService.getParticipants(chatId);
    if (!participants || participants.length === 0) {
      throw new NotFoundException(`No participants found for chat ${chatId}`);
    }
    return {
      message: "Chat participants fetched successfully",
      data: participants,
    };
  }

  // Get all chats (public list)

  // Get all chats for a user (WhatsApp-style chat list)
  @Get("user/:userId")
  async getChatsForUser(
    @Param("userId") userId: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("search") search?: string
  ) {
    const result = await this.chatService.getChatsForUser(
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
      search
    );

    return {
      message: `Chats for user ${userId} fetched successfully`,
      data: result, // 👈 return only formatted chat list
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  // --- MESSAGES ---

  // Send a message in a chat
  @Post(":chatId/messages")
  async sendMessage(
    @Param("chatId") chatId: string,
    @Body() body: { senderId: string; content: string; contentType?: string }
  ) {
    const msg = await this.chatService.saveMessage(
      chatId,
      body.senderId,
      body.content
    );
    return {
      message: "Message sent successfully",
      data: msg,
    };
  }

  // Get paginated chat history
  @Get(":chatId/messages")
  async getMessages(
    @Param("chatId") chatId: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20"
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const messages = await this.chatService.getMessagesPaginated(
      chatId,
      pageNum,
      limitNum
    );
    return {
      message: "Chat history fetched successfully",
      data: messages,
    };
  }
}
