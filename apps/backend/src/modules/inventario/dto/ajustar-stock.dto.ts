import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum TipoAjusteInventario {
  INGRESO = 'INGRESO',
  MERMA = 'MERMA',
  DEVOLUCION = 'DEVOLUCION',
  CONTEO = 'CONTEO',
}

export class AjustarStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  varianteId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeId: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ enum: TipoAjusteInventario, example: TipoAjusteInventario.INGRESO })
  @IsEnum(TipoAjusteInventario)
  motivo: TipoAjusteInventario;

  @ApiPropertyOptional({ example: 'Ajuste manual por conteo' })
  @IsOptional()
  @IsString()
  nota?: string;
}
