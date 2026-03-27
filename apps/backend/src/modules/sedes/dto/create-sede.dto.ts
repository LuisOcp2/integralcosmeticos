import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
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
}
