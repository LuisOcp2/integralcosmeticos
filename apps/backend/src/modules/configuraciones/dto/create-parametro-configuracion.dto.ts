import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

const TIPOS_DATO = ['STRING', 'NUMBER', 'BOOLEAN', 'JSON'] as const;

export class CreateParametroConfiguracionDto {
  @ApiProperty({ example: 'venta.moneda' })
  @IsString()
  @Length(3, 120)
  clave: string;

  @ApiPropertyOptional({ example: 'COP' })
  @IsString()
  @IsOptional()
  valor?: string;

  @ApiPropertyOptional({ example: 'Moneda usada para transacciones' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 'STRING', enum: TIPOS_DATO })
  @IsIn(TIPOS_DATO)
  tipoDato: (typeof TIPOS_DATO)[number];

  @ApiPropertyOptional({ example: 'ventas' })
  @IsString()
  @IsOptional()
  @Length(2, 60)
  modulo?: string;
}
