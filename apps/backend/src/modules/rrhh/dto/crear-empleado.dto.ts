import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  EstadoEmpleado,
  TipoContratoEmpleado,
  TipoDocumentoEmpleado,
} from '../entities/empleado.entity';

export class CrearEmpleadoDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @ApiProperty({ enum: TipoDocumentoEmpleado })
  @IsEnum(TipoDocumentoEmpleado)
  tipoDocumento: TipoDocumentoEmpleado;

  @ApiProperty({ maxLength: 20 })
  @IsString()
  @MaxLength(20)
  numeroDocumento: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  apellido: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @ApiPropertyOptional({ maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  genero?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cargoId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  areaId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sedeId: string;

  @ApiProperty({ enum: TipoContratoEmpleado })
  @IsEnum(TipoContratoEmpleado)
  tipoContrato: TipoContratoEmpleado;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  fechaIngreso: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  fechaRetiro?: string;

  @ApiPropertyOptional({ enum: EstadoEmpleado })
  @IsOptional()
  @IsEnum(EstadoEmpleado)
  estado?: EstadoEmpleado;

  @ApiProperty({ example: 1800000 })
  @IsNumber()
  @Min(0)
  salarioBase: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  auxilioTransporte?: boolean;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  eps?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  arl?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fondoPension?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  cuentaBancaria?: string;
}
