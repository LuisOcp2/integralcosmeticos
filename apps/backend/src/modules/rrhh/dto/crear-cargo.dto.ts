import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { NivelCargo } from '../entities/cargo.entity';

export class CrearCargoDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  areaId: string;

  @ApiProperty({ example: 2000000 })
  @IsNumber()
  @Min(0)
  salarioBase: number;

  @ApiProperty({ enum: NivelCargo })
  @IsEnum(NivelCargo)
  nivel: NivelCargo;
}
