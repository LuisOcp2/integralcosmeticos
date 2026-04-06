import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class AbrirCajaDto {
  @ApiProperty({ example: 100000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  montoApertura?: number;

  @ApiPropertyOptional({ example: 100000, deprecated: true })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  montoInicial?: number;
}
