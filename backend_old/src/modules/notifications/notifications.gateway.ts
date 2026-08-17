import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection,
  OnGatewayDisconnect, SubscribeMessage, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSocketMap = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });

      if (!user || !user.isActive) {
        client.disconnect();
        return;
      }

      client.data.userId = user.id;
      client.data.user = user;

      if (!this.userSocketMap.has(user.id)) {
        this.userSocketMap.set(user.id, new Set());
      }
      this.userSocketMap.get(user.id).add(client.id);

      await this.userRepository.update(user.id, { isOnline: true });

      client.join(`user:${user.id}`);
      client.join(`role:${user.role}`);
      if (user.departmentId) client.join(`dept:${user.departmentId}`);

      this.logger.log(`Client connected: ${user.email} (${client.id})`);

      client.emit('connected', { userId: user.id, socketId: client.id });
    } catch (error) {
      this.logger.warn(`Unauthorized connection: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      const sockets = this.userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSocketMap.delete(userId);
          await this.userRepository.update(userId, { isOnline: false, lastSeenAt: new Date() });
        }
      }
      this.logger.log(`Client disconnected: ${userId} (${client.id})`);
    }
  }

  @SubscribeMessage('join-conversation')
  handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() conversationId: string) {
    client.join(`conversation:${conversationId}`);
    this.logger.debug(`${client.data.userId} joined conversation:${conversationId}`);
  }

  @SubscribeMessage('leave-conversation')
  handleLeaveConversation(@ConnectedSocket() client: Socket, @MessageBody() conversationId: string) {
    client.leave(`conversation:${conversationId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.to(`conversation:${data.conversationId}`).emit('typing', {
      userId: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  emitToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, data);
  }
}
