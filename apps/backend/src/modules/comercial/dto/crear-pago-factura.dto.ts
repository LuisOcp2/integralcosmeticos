import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoPago } from '@cosmeticos/shared-types';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CrearPagoFacturaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  facturaId: string;

  @ApiProperty({ example: '2026-05-15' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiProperty({ enum: MetodoPago })
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  referencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  registradoPorId: string;
}
