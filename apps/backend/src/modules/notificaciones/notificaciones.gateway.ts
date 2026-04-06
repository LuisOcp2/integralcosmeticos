import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notificaciones' })
export class NotificacionesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificacionesGateway.name);
  private readonly socketRooms = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(@ConnectedSocket() socket: Socket) {
    try {
      const rawToken =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers.authorization as string | undefined);

      const token = rawToken?.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
      if (!token) {
        socket.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
        secret: this.configService.get<string>('app.jwtSecret'),
      });

      const userId = payload.sub;
      const room = `user:${userId}`;

      await socket.join(room);
      this.socketRooms.set(socket.id, room);
    } catch (error) {
      this.logger.warn(`Socket rechazado en notificaciones: ${(error as Error).message}`);
      socket.disconnect(true);
    }
  }

  async handleDisconnect(@ConnectedSocket() socket: Socket) {
    const room = this.socketRooms.get(socket.id);
    if (room) {
      await socket.leave(room);
      this.socketRooms.delete(socket.id);
    }
  }

  emitNuevaNotificacion(userId: string, notificacion: unknown) {
    this.server.to(`user:${userId}`).emit('nueva-notificacion', notificacion);
  }
}
