import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsString, MaxLength } from 'class-validator';
import { PlanEmpresa } from '../entities/empresa.entity';

export class CrearEmpresaDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  nombre: string;

  @ApiProperty({ maxLength: 20 })
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  nit: string;

  @ApiProperty({ maxLength: 200 })
  @IsEmail()
  @MaxLength(200)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ enum: PlanEmpresa, default: PlanEmpresa.STARTER })
  @IsEnum(PlanEmpresa)
  plan: PlanEmpresa;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  adminNombre: string;

  @ApiProperty({ maxLength: 200 })
  @IsEmail()
  @MaxLength(200)
  @Transform(({ value }) => value?.toLowerCase().trim())
  adminEmail: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  adminPassword: string;
}
