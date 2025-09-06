import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private chatService: ChatService) {}

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `chat:${data.chatId}`;
    client.join(room);

    // Fetch history from DB
    const history = await this.chatService.getChatHistory(data.chatId);
    client.emit('chat_history', history);

    // Notify others
    this.server.to(room).emit('system', { msg: `User joined chat ${data.chatId}` });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: { chatId: string; content: string; senderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Save to DB
    const newMsg = await this.chatService.saveMessage(data.chatId, data.senderId, data.content);

    // Broadcast
    this.server.to(`chat:${data.chatId}`).emit('message', newMsg);
  }
}
