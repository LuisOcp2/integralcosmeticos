import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsUUID, ValidateNested } from 'class-validator';

class PrecioItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  itemId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  precioActual: number;
}

export class ActualizarPreciosLoteDto {
  @ApiProperty({ type: [PrecioItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrecioItemDto)
  items: PrecioItemDto[];
}
