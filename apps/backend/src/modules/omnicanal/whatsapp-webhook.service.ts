import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OmnicanalService } from './omnicanal.service';
import { CanalOmnicanal } from './entities/conversacion.entity';

@Injectable()
export class WhatsappWebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly omnicanalService: OmnicanalService,
  ) {}

  verificar(mode?: string, token?: string, challenge?: string) {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode !== 'subscribe' || !token || token !== verifyToken) {
      throw new ForbiddenException('Token de verificacion invalido');
    }

    return challenge ?? '';
  }

  async procesar(body: any) {
    const mensaje = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!mensaje) {
      return { ok: true, ignored: true };
    }

    const contacto = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
    const contactoIdentificador = contacto?.wa_id ?? mensaje.from;
    const contactoNombre = contacto?.profile?.name ?? 'Cliente WhatsApp';
    const contenido = mensaje?.text?.body ?? '[mensaje sin texto]';

    await this.omnicanalService.recibirMensajeExterno(
      CanalOmnicanal.WHATSAPP,
      String(contactoIdentificador),
      String(contactoNombre),
      String(contenido),
      mensaje?.id,
    );

    return { ok: true };
  }
}
