import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BuscarProductoDto {
  @ApiProperty({
    example: '7701234567890',
    description: 'Busqueda por nombre, SKU o codigo de barra para POS',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q: string;
}
