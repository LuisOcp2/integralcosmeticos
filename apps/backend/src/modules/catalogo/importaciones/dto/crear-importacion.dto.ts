import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ModoImportacion } from './validar-importacion.dto';

export class CrearImportacionDto {
  @ApiPropertyOptional({ enum: ModoImportacion, default: ModoImportacion.CREAR_O_ACTUALIZAR })
  @IsOptional()
  @IsEnum(ModoImportacion)
  modo?: ModoImportacion;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  dryRun?: boolean;
}
