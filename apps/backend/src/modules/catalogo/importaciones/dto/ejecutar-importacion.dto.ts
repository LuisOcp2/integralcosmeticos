import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class EjecutarImportacionDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
