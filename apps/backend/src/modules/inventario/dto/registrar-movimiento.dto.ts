import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMovimiento } from '@cosmeticos/shared-types';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RegistrarMovimientoDto {
  @ApiProperty({ enum: TipoMovimiento, example: TipoMovimiento.ENTRADA })
  @IsEnum(TipoMovimiento)
  tipo: TipoMovimiento;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  varianteId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  sedeOrigenId?: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  sedeDestinoId?: string;

  @ApiPropertyOptional({ example: 'Ingreso por compra proveedor' })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiPropertyOptional({ example: 'OC-2026-00123', maxLength: 100 })
  @IsString()
  @IsOptional()
  referencia?: string;

  @IsOptional()
  @IsInt()
  cantidadNueva?: number;
}
