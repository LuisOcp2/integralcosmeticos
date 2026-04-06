import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoActivo } from '../entities/activo.entity';

export class CreateActivoDto {
  @ApiProperty({ example: 'Laptop ejecutiva' })
  @IsString()
  @MaxLength(200)
  nombre: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoriaId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  custodioId?: string;

  @ApiPropertyOptional({ enum: EstadoActivo })
  @IsOptional()
  @IsEnum(EstadoActivo)
  estado?: EstadoActivo;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serial?: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  fechaCompra: string;

  @ApiProperty({ example: 2500000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorCompra: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorResidual?: number;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  proximoMantenimiento?: string;

  @ApiPropertyOptional({ example: '2028-01-15' })
  @IsOptional()
  @IsDateString()
  garantiaHasta?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  foto?: string;
}
