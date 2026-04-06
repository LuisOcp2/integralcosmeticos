import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Matches, Min, ValidateNested } from 'class-validator';

const UUID_FORMAT_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class RecibirDetalleOrdenCompraDto {
  @ApiProperty({ format: 'uuid' })
  @Matches(UUID_FORMAT_REGEX, { message: 'detalleId must be a UUID' })
  detalleId: string;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidadRecibida: number;
}

export class RecibirOrdenCompraDto {
  @ApiProperty({ type: [RecibirDetalleOrdenCompraDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecibirDetalleOrdenCompraDto)
  detalles: RecibirDetalleOrdenCompraDto[];
}
