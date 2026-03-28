import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class SubirImportacionQueryDto {
  @ApiPropertyOptional({
    default: true,
    description: 'Si true, valida archivo sin persistir cambios',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  dryRun?: boolean;
}
