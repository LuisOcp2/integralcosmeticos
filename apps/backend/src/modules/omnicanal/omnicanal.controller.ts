import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InboxQueryDto } from './dto/inbox-query.dto';
import { PaginacionDto } from './dto/paginacion.dto';
import { EnviarMensajeDto } from './dto/enviar-mensaje.dto';
import { AsignarConversacionDto } from './dto/asignar-conversacion.dto';
import { CreatePlantillaMensajeDto } from './dto/create-plantilla-mensaje.dto';
import { UpdatePlantillaMensajeDto } from './dto/update-plantilla-mensaje.dto';
import { OmnicanalService } from './omnicanal.service';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@ApiTags('omnicanal')
@Controller('omnicanal')
export class OmnicanalController {
  constructor(
    private readonly omnicanalService: OmnicanalService,
    private readonly whatsappWebhookService: WhatsappWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Get('conversaciones')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Inbox omnicanal' })
  getInbox(@Query() query: InboxQueryDto) {
    return this.omnicanalService.getInbox(query);
  }

  @Get('conversaciones/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detalle de conversacion con mensajes' })
  getConversacion(@Param('id') id: string, @Query() query: PaginacionDto) {
    return this.omnicanalService.getConversacionDetalle(id, query.page, query.limit);
  }

  @Post('conversaciones/:id/mensajes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Enviar mensaje en conversacion' })
  enviarMensaje(@Param('id') id: string, @Body() dto: EnviarMensajeDto, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.omnicanalService.enviarMensaje(id, dto, user.id);
  }

  @Patch('conversaciones/:id/asignar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Asignar conversacion a un usuario' })
  asignar(@Param('id') id: string, @Body() dto: AsignarConversacionDto) {
    return this.omnicanalService.asignar(id, dto.usuarioId);
  }

  @Patch('conversaciones/:id/resolver')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Resolver conversacion' })
  resolver(@Param('id') id: string) {
    return this.omnicanalService.resolver(id);
  }

  @Post('plantillas')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear plantilla de mensaje' })
  createPlantilla(@Body() dto: CreatePlantillaMensajeDto) {
    return this.omnicanalService.crearPlantilla(dto);
  }

  @Get('plantillas')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar plantillas' })
  listPlantillas() {
    return this.omnicanalService.listarPlantillas();
  }

  @Get('plantillas/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener plantilla por id' })
  getPlantilla(@Param('id') id: string) {
    return this.omnicanalService.getPlantilla(id);
  }

  @Patch('plantillas/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar plantilla' })
  updatePlantilla(@Param('id') id: string, @Body() dto: UpdatePlantillaMensajeDto) {
    return this.omnicanalService.updatePlantilla(id, dto);
  }

  @Delete('plantillas/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar plantilla' })
  removePlantilla(@Param('id') id: string) {
    return this.omnicanalService.removePlantilla(id);
  }

  @Get('webhooks/whatsapp')
  @ApiOperation({ summary: 'Verificacion webhook Meta WhatsApp' })
  verificarWhatsapp(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
    @Res() res?: Response,
  ) {
    // Requiere variables .env para integracion con Meta Cloud API:
    // WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
    // Si AUTH_ENABLED_WHATSAPP_WEBHOOK=true, valida x-whatsapp-webhook-secret contra WHATSAPP_VERIFY_TOKEN.
    const authEnabled =
      String(this.configService.get<string>('AUTH_ENABLED_WHATSAPP_WEBHOOK') ?? 'false') === 'true';

    if (authEnabled && !token) {
      return res?.status(403).send('Forbidden');
    }

    try {
      const response = this.whatsappWebhookService.verificar(mode, token, challenge);
      return res?.status(200).send(response);
    } catch {
      return res?.status(403).send('Forbidden');
    }
  }

  @Post('webhooks/whatsapp')
  @ApiOperation({ summary: 'Recepcion webhook Meta WhatsApp' })
  async procesarWhatsapp(@Body() body: any, @Req() req: Request, @Res() res?: Response) {
    const authEnabled =
      String(this.configService.get<string>('AUTH_ENABLED_WHATSAPP_WEBHOOK') ?? 'false') === 'true';

    if (authEnabled) {
      const sharedSecret = req.headers['x-whatsapp-webhook-secret'];
      const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
      if (!sharedSecret || sharedSecret !== verifyToken) {
        return res?.status(403).send('Forbidden');
      }
    }

    return this.whatsappWebhookService.procesar(body);
  }
}
