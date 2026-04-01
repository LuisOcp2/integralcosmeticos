import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProveedorDto {
  @ApiProperty({ example: 'PROV001' })
  @IsString()
  codigo: string;

  @ApiProperty({ example: 'Proveedor Test S.A.S' })
  @IsString()
  razonSocial: string;

  @ApiPropertyOptional({ example: 'Nombre Comercial del Proveedor' })
  @IsOptional()
  @IsString()
  nombreComercial?: string;

  @ApiPropertyOptional({ example: '900123456-7' })
  @IsOptional()
  @IsString()
  numeroDocumentoLegal?: string;

  @ApiPropertyOptional({ example: 'NIT' })
  @IsOptional()
  @IsString()
  tipoDocumento?: string;

  @ApiPropertyOptional({ example: 'contacto@proveedortest.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: '3101234567' })
  @IsOptional()
  @IsString()
  celular?: string;

  @ApiPropertyOptional({ example: 'Carrera 15 # 123-45, Bogotá' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ example: 'Bogotá' })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiPropertyOptional({ example: 'Cundinamarca' })
  @IsOptional()
  @IsString()
  departamento?: string;

  @ApiPropertyOptional({ example: 'Colombia' })
  @IsOptional()
  @IsString()
  pais?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  contactoNombre?: string;

  @ApiPropertyOptional({ example: 'Gerente de Ventas' })
  @IsOptional()
  @IsString()
  contactoCargo?: string;

  @ApiPropertyOptional({ example: '3001234568' })
  @IsOptional()
  @IsString()
  contactoTelefono?: string;

  @ApiPropertyOptional({ example: 'www.proveedortest.com' })
  @IsOptional()
  @IsString()
  sitioWeb?: string;

  @ApiPropertyOptional({ example: '30 días' })
  @IsOptional()
  @IsString()
  condicionesPago?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  descuentoProveedor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
