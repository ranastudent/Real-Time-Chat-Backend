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
  handleJoinChat(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    client.join(`chat:${data.chatId}`);
    this.server.to(`chat:${data.chatId}`).emit('system', { msg: `User joined chat ${data.chatId}` });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(@MessageBody() data: { chatId: string; content: string; sender: string }) {
    // Save to DB
    await this.chatService.saveMessage(data.chatId, data.sender, data.content);

    // Broadcast
    this.server.to(`chat:${data.chatId}`).emit('message', data);
  }
}
