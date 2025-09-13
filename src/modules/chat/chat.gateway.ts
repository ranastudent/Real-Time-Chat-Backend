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

  // Track all sockets per user
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private chatService: ChatService) {}

  handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
    }
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @MessageBody() data: SocketJoinData,
    @ConnectedSocket() client: Socket,
  ) {
    const { chatId, user } = data;

    // Track user device
    if (!this.userSockets.has(user.userId)) this.userSockets.set(user.userId, new Set());
    this.userSockets.get(user.userId)!.add(client.id);

    // Join DB and Socket room
    await this.chatService.joinRoom(chatId, user);
    const room = `chat:${chatId}`;
    client.join(room);

    // Send chat history
    const history = await this.chatService.getChatHistory(chatId);
    client.emit('chat_history', history);

    // Notify others in room
    client.to(room).emit('system', { msg: `User ${user.userId} joined chat ${chatId}` });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: SocketMessageData,
    @ConnectedSocket() client: Socket,
  ) {
    const { chatId, content, user } = data;
    const newMsg = await this.chatService.saveMessage(chatId, user, content);

    // Broadcast to room (all devices)
    const room = `chat:${chatId}`;
    this.server.to(room).emit('message', newMsg);

    // Remove typing if user was typing
    this.chatService.removeUserTyping(chatId, user.userId);
    this.server.to(room)
      .except([...this.userSockets.get(user.userId) ?? []])
      .emit('user_typing', { userId: user.userId, typing: false });
  }

  @SubscribeMessage('leave_chat')
  async handleLeaveChat(
    @MessageBody() data: { chatId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `chat:${data.chatId}`;
    client.leave(room);
    this.server.to(room).emit('system', { msg: `User ${data.userId} left chat ${data.chatId}` });
  }

  // --- TYPING START ---
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { chatId: string; user: JwtUser },
  ) {
    const { chatId, user } = data;
    const room = `chat:${chatId}`;

    // Mark user as typing in service
    this.chatService.setUserTyping(chatId, user.userId);

    // Notify all other devices (except current)
    this.server.to(room)
      .except([...this.userSockets.get(user.userId) ?? []])
      .emit('user_typing', { userId: user.userId, typing: true });

    // Auto-stop typing after 5s
    setTimeout(() => {
      this.chatService.removeUserTyping(chatId, user.userId);
      this.server.to(room)
        .except([...this.userSockets.get(user.userId) ?? []])
        .emit('user_typing', { userId: user.userId, typing: false });
    }, 5000);
  }

  // --- TYPING STOP (EXPLICIT) ---
  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { chatId: string; user: JwtUser },
  ) {
    const { chatId, user } = data;
    const room = `chat:${chatId}`;

    // Remove typing in service
    this.chatService.removeUserTyping(chatId, user.userId);

    // Notify other devices
    this.server.to(room)
      .except([...this.userSockets.get(user.userId) ?? []])
      .emit('user_typing', { userId: user.userId, typing: false });
  }
}
