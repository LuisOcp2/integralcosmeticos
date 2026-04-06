import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProveedorDto {
  @ApiProperty({ example: 'Distribuciones Cosmocol S.A.S' })
  @IsString()
  @MaxLength(200)
  nombre: string;

  @ApiProperty({ example: '900123456-7' })
  @IsString()
  @Length(1, 20)
  nit: string;

  @ApiPropertyOptional({ example: 'compras@cosmocol.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ example: '6014567890' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  telefono?: string;

  @ApiPropertyOptional({ example: 'Laura Alvarez' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactoNombre?: string;

  @ApiPropertyOptional({ example: 'Cra 12 #45-67' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ example: 'Bogota' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ example: 'Entrega martes y viernes' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ example: 15, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  diasCredito?: number;

  @ApiPropertyOptional({ example: 5000000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  limiteCredito?: number;
}
