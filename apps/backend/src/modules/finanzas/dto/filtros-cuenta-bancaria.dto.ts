import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TipoCuentaBancaria } from '../entities/cuenta-bancaria.entity';

export class FiltrosCuentaBancariaDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TipoCuentaBancaria })
  @IsOptional()
  @IsEnum(TipoCuentaBancaria)
  tipoCuenta?: TipoCuentaBancaria;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activa?: boolean;

  @ApiPropertyOptional({ example: 'bancolombia' })
  @IsOptional()
  @IsString()
  q?: string;
}
