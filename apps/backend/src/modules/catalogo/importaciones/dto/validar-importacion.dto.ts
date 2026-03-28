import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ModoImportacion {
  CREAR_SOLO = 'crear_solo',
  ACTUALIZAR_SOLO = 'actualizar_solo',
  CREAR_O_ACTUALIZAR = 'crear_o_actualizar',
}

export class ValidarImportacionDto {
  @ApiPropertyOptional({
    enum: ModoImportacion,
    default: ModoImportacion.CREAR_O_ACTUALIZAR,
  })
  @IsOptional()
  @IsEnum(ModoImportacion)
  modo?: ModoImportacion;
}
