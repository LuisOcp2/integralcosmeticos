import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class AjustarStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  varianteId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeId: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  cantidadNueva: number;

  @ApiProperty({ example: 'Ajuste por conteo fisico de inventario' })
  @IsString()
  motivo: string;

  @ApiPropertyOptional({ example: 'Incluye merma de exhibicion' })
  @IsOptional()
  @IsString()
  referencia?: string;
}
