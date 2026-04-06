import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { TipoPresupuestoMensual } from '../entities/presupuesto-mensual.entity';

export class CrearPresupuestoMensualDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  periodoId: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  categoria: string;

  @ApiProperty({ enum: TipoPresupuestoMensual })
  @IsEnum(TipoPresupuestoMensual)
  tipo: TipoPresupuestoMensual;

  @ApiProperty({ example: 1500000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montoPresupuestado: number;
}
