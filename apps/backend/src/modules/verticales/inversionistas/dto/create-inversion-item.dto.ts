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
} from 'class-validator';
import { TipoInversionItem } from '../entities/inversion-item.entity';

export class CreateInversionItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  portafolioId: string;

  @ApiProperty({ enum: TipoInversionItem })
  @IsEnum(TipoInversionItem)
  tipo: TipoInversionItem;

  @ApiProperty({ maxLength: 150 })
  @IsString()
  @MaxLength(150)
  nombre: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  simbolo?: string;

  @ApiPropertyOptional({ default: 'COP', maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  cantidadUnidades: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  precioCompra: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  precioActual: number;

  @ApiProperty()
  @IsDateString()
  fechaCompra: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  dividendos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}
