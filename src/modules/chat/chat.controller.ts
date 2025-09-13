import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
  NotFoundException,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { Response, Request } from "express";
import { JwtUser } from "../../types/jwt-user";

@Controller("chats")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // --- CREATE CHAT ROOM ---
  @Post()
  async createChat(
    @Req() req: { user: JwtUser },
    @Body() body: { title: string; isGroup?: boolean },
  ) {
    const chat = await this.chatService.createRoom(
      body.title,
      req.user,
      body.isGroup,
    );
    return { message: "Chat created successfully", data: chat };
  }

  // --- JOIN CHAT ROOM ---
  @Post(":chatId/join")
  async joinChat(@Req() req: { user: JwtUser }, @Param("chatId") chatId: string) {
    const participant = await this.chatService.joinRoom(chatId, req.user);
    return { message: "User joined chat successfully", data: participant };
  }

  // --- GET ALL CHATS FOR AUTHENTICATED USER ---
  @Get()
  async getMyChats(
    @Req() req: { user: JwtUser },
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

  // --- GET CHAT HISTORY FOR A SPECIFIC CHAT (INCLUDING TYPING USERS) ---
  @Get(":chatId/history")
  async getChatHistory(
    @Req() req: { user: JwtUser },
    @Param("chatId") chatId: string,
  ) {
    const history = await this.chatService.getChatHistory(chatId);

    // Get current typing users from ChatService
    const typingUsers = this.chatService.getTypingUsers(chatId).filter(
      (u) => u !== req.user.userId, // exclude requesting user
    );

    return {
      message: "Chat history fetched successfully",
      data: history,
      typingUsers,
    };
  }

  // --- SEND TEXT MESSAGE ---
  @Post(":chatId/messages")
  async sendMessage(
    @Req() req: { user: JwtUser },
    @Param("chatId") chatId: string,
    @Body() body: { content: string },
  ) {
    const msg = await this.chatService.saveMessage(
      chatId,
      req.user,
      body.content,
    );
    return { message: "Message sent successfully", data: msg };
  }

  // --- SEND MEDIA MESSAGE ---
  @Post(":chatId/messages/media")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  async sendMediaMessage(
    @Req() req: Request & { user: JwtUser },
    @Param("chatId") chatId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("content") content?: string,
  ) {
    if (!file) throw new NotFoundException("No file uploaded");

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const msg = await this.chatService.saveMessage(chatId, req.user, content || null, {
      mediaUrl: `${baseUrl}/chats/media/${file.filename}`,
      mediaType: file.mimetype,
    });

    return { message: "Media message sent successfully", data: msg };
  }

  // --- DOWNLOAD MEDIA ---
  @Get(":chatId/messages/:messageId/download")
  async downloadMedia(
    @Req() req: { user: JwtUser },
    @Param("chatId") chatId: string,
    @Param("messageId") messageId: string,
    @Res() res: Response,
  ) {
    return this.chatService.downloadMedia(chatId, messageId, req.user, res);
  }
}
