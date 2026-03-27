import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { TipoSede } from '@cosmeticos/shared-types';

export class CreateSedeDto {
  @ApiProperty({ example: 'Sede Centro' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Calle 10 # 20-30' })
  @IsString()
  direccion: string;

  @ApiProperty({ example: 'Bogota' })
  @IsString()
  ciudad: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ enum: TipoSede, example: TipoSede.TIENDA })
  @IsEnum(TipoSede)
  tipo: TipoSede;

  @ApiPropertyOptional({ example: 'COP' })
  @IsOptional()
  @IsString()
  @Length(3, 10)
  moneda?: string;

  @ApiPropertyOptional({ example: 19 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  impuestoPorcentaje?: number;
}
