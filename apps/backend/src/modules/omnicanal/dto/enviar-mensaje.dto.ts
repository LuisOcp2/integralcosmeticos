import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoMensajeOmnicanal } from '../entities/mensaje.entity';

export class EnviarMensajeDto {
  @ApiProperty()
  @IsString()
  contenido: string;

  @ApiProperty({ enum: TipoMensajeOmnicanal, default: TipoMensajeOmnicanal.TEXTO })
  @IsOptional()
  @IsEnum(TipoMensajeOmnicanal)
  tipo?: TipoMensajeOmnicanal;
}
