import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/omnicanal' })
export class OmnicanalGateway {
  @WebSocketServer()
  server: Server;

  emitirNuevoMensajeConversacion(conversacionId: string, payload: unknown) {
    this.server.to(`conv:${conversacionId}`).emit('nuevo-mensaje', payload);
  }

  emitirNuevoMensajeInbox(payload: unknown) {
    this.server.emit('nuevo-mensaje', payload);
  }
}
