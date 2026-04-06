import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CerrarCajaDto {
  @ApiProperty({ example: 350000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  montoCierre?: number;

  @ApiPropertyOptional({ example: 350000, deprecated: true })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  montoFinal?: number;

  @ApiPropertyOptional({ example: 'Sin novedades en arqueo' })
  @IsString()
  @IsOptional()
  notas?: string;
}
