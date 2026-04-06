import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReportesQueryDto } from './reportes-query.dto';

export class ProductosMasVendidosQueryDto extends ReportesQueryDto {
  @ApiPropertyOptional({ description: 'Cantidad de productos a retornar', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  top?: number = 10;
}
