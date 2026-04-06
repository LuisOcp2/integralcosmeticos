import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CrearFacturaDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  pedidoId?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clienteId: string;

  @ApiProperty({ example: '2026-04-10' })
  @IsDateString()
  fechaEmision: string;

  @ApiProperty({ example: '2026-04-25' })
  @IsDateString()
  fechaVencimiento: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  impuestos?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retencion?: number;
}
