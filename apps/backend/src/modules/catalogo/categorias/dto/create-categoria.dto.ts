import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Maquillaje' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Productos para maquillaje facial' })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
