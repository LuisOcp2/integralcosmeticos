import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { EstadoInmueble, NegocioInmueble, TipoInmueble } from '../entities/inmueble.entity';

export class FiltrosInmueblesDto {
  @ApiPropertyOptional({ enum: TipoInmueble })
  @IsOptional()
  @IsEnum(TipoInmueble)
  tipo?: TipoInmueble;

  @ApiPropertyOptional({ enum: EstadoInmueble })
  @IsOptional()
  @IsEnum(EstadoInmueble)
  estado?: EstadoInmueble;

  @ApiPropertyOptional({ enum: NegocioInmueble })
  @IsOptional()
  @IsEnum(NegocioInmueble)
  negocio?: NegocioInmueble;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ciudad?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  valorMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  valorMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  areaMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  areaMax?: number;
}
