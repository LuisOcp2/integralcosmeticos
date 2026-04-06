import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoCuentaBancaria } from '../entities/cuenta-bancaria.entity';

export class CrearCuentaBancariaDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  banco: string;

  @ApiProperty({ enum: TipoCuentaBancaria })
  @IsEnum(TipoCuentaBancaria)
  tipoCuenta: TipoCuentaBancaria;

  @ApiProperty({ maxLength: 30 })
  @IsString()
  @MaxLength(30)
  numeroCuenta: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsNumber()
  saldoInicial: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  saldoActual?: number;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  fechaSaldoInicial: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activa?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  esPrincipal?: boolean;

  @ApiPropertyOptional({ default: 'COP', maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda?: string;
}
