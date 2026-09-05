import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) throw new Error('No token provided');

      const decoded = this.jwtService.verify(token);
      client.data.user = decoded;
      
      // Join a room specific to this user to receive direct IN_APP notifications
      const userRoom = `user_${decoded.sub}`;
      client.join(userRoom);
      
      this.logger.log(`Client connected to notifications: ${client.id} (User: ${decoded.sub})`);
    } catch (err) {
      this.logger.error(`Connection failed: ${(err as any).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from notifications: ${client.id}`);
  }

  emitInAppNotification(userId: string, payload: any) {
    this.server.to(`user_${userId}`).emit('notification.received', payload);
  }
}
