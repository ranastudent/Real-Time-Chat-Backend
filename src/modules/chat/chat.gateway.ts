import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtUser } from '../../types/jwt-user';

interface SocketJoinData {
  chatId: string;
  user: JwtUser;
}

interface SocketMessageData {
  chatId: string;
  content: string;
  user: JwtUser;
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private chatService: ChatService) {}

  // --- DISCONNECT ---
  async handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);

        // Clear typing state for this socket
        await this.chatService.clearUserTypingAll(userId, client.id);

        // Notify all chats user was typing in
        const activeChats = await this.chatService.getChatsUserTypingIn(userId);
        activeChats.forEach((chatId) => {
          const room = `chat:${chatId}`;
          this.server.to(room).emit('user_typing', { userId, typing: false });
        });
      }
    }
  }

  // --- JOIN CHAT ---
  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @MessageBody() data: SocketJoinData,
    @ConnectedSocket() client: Socket,
  ) {
    const { chatId, user } = data;

    if (!this.userSockets.has(user.userId)) this.userSockets.set(user.userId, new Set());
    this.userSockets.get(user.userId)!.add(client.id);

    await this.chatService.joinRoom(chatId, user);
    const room = `chat:${chatId}`;
    client.join(room);

    // Send chat history
    const history = await this.chatService.getChatHistory(chatId);
    client.emit('chat_history', history);

    // Active typing users (optimized)
    const typingUsers = await this.chatService.getTypingUsers(chatId);
    typingUsers.forEach((u) => {
      if (u !== user.userId) {
        client.emit('user_typing', { userId: u, typing: true });
      }
    });

    client.to(room).emit('system', { msg: `User ${user.userId} joined chat ${chatId}` });
  }

  // --- SEND MESSAGE ---
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: SocketMessageData,
    @ConnectedSocket() client: Socket,
  ) {
    const { chatId, content, user } = data;
    const newMsg = await this.chatService.saveMessage(chatId, user, content);

    const room = `chat:${chatId}`;
    this.server.to(room).emit('message', newMsg);

    // Remove typing state for this socket
    await this.chatService.setUserTyping(chatId, user.userId, client.id, false);

    // Notify others
    this.server.to(room)
      .except([...this.userSockets.get(user.userId) ?? []])
      .emit('user_typing', { userId: user.userId, typing: false });
  }

  // --- LEAVE CHAT ---
  @SubscribeMessage('leave_chat')
  async handleLeaveChat(
    @MessageBody() data: { chatId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `chat:${data.chatId}`;
    client.leave(room);
    await this.chatService.clearUserTypingAll(data.userId, client.id);

    this.server.to(room).emit('system', { msg: `User ${data.userId} left chat ${data.chatId}` });
  }

  // --- TYPING START ---
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { chatId: string; user: JwtUser },
    @ConnectedSocket() client: Socket,
  ) {
    const { chatId, user } = data;
    const room = `chat:${chatId}`;

    await this.chatService.setUserTyping(chatId, user.userId, client.id, true);

    this.server.to(room)
      .except([...this.userSockets.get(user.userId) ?? []])
      .emit('user_typing', { userId: user.userId, typing: true });
  }

  // --- TYPING STOP ---
  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { chatId: string; user: JwtUser },
    @ConnectedSocket() client: Socket,
  ) {
    const { chatId, user } = data;
    const room = `chat:${chatId}`;

    await this.chatService.setUserTyping(chatId, user.userId, client.id, false);

    this.server.to(room)
      .except([...this.userSockets.get(user.userId) ?? []])
      .emit('user_typing', { userId: user.userId, typing: false });
  }

  // --- TYPING PING ---
  @SubscribeMessage('typing_ping')
  async handleTypingPing(
    @MessageBody() data: { chatId: string; user: JwtUser },
    @ConnectedSocket() client: Socket,
  ) {
    await this.chatService.refreshTypingTTL(data.chatId, data.user.userId, client.id);
  }
}
