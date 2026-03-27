import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class TrasladarStockDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  varianteId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeOrigen: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeDestino: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ example: 'Traslado de reposicion' })
  @IsString()
  @IsOptional()
  motivo?: string;
}
