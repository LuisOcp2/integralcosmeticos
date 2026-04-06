import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Conversacion } from './entities/conversacion.entity';
import { Mensaje } from './entities/mensaje.entity';
import { PlantillaMensaje } from './entities/plantilla-mensaje.entity';
import { OmnicanalController } from './omnicanal.controller';
import { OmnicanalGateway } from './omnicanal.gateway';
import { OmnicanalService } from './omnicanal.service';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Conversacion, Mensaje, PlantillaMensaje, Cliente, Usuario]),
  ],
  controllers: [OmnicanalController],
  providers: [OmnicanalService, OmnicanalGateway, WhatsappWebhookService],
  exports: [OmnicanalService],
})
export class OmnicanalModule {}
