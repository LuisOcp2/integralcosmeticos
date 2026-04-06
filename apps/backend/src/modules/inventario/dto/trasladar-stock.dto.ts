import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class TrasladarStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  varianteId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeOrigenId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeDestinoId: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ example: 'Traslado de reposicion' })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiPropertyOptional({ example: 'TR-2026-00021' })
  @IsString()
  @IsOptional()
  referencia?: string;
}
