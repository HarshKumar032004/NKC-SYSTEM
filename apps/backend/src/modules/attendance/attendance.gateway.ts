import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AttendanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or headers
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }
      
      const payload = this.jwtService.verify(token);
      // Attach user info to socket
      (client as any).user = payload;
      
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup if necessary
  }

  @SubscribeMessage('joinBranch')
  handleJoinBranch(client: Socket, branchId: string) {
    const user = (client as any).user;
    if (user && user.branchId === branchId) {
      client.join(`branch_${branchId}`);
      client.emit('joinedRoom', `branch_${branchId}`);
    } else {
      client.emit('error', 'Unauthorized branch room access');
    }
  }

  /**
   * Broadcast attendance update to a specific branch room.
   */
  emitAttendanceUpdate(branchId: string, batchId: string, stats: any) {
    this.server.to(`branch_${branchId}`).emit('attendance.updated', { batchId, stats });
  }
}
