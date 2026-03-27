import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class CreateVarianteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ example: 'Tono Nude 01' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: '7701234567890' })
  @IsString()
  codigoBarras: string;

  @ApiProperty({ example: 'BASE-HD-NUDE-01' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  precioExtra: number;
}
