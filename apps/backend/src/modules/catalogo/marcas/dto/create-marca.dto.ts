import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateMarcaDto {
  @ApiProperty({ example: 'Loreal' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Marca internacional de cosmeticos' })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
