import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';

/**
 * DTO de respuesta para Usuario.
 * Usa @Exclude a nivel clase para omitir campos sensibles por defecto.
 * Requiere ClassSerializerInterceptor activo en el controlador.
 */
@Exclude()
export class UsuarioResponseDto {
  @Expose()
  @ApiProperty({ description: 'Identificador único del usuario' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'Juan' })
  nombre: string;

  @Expose()
  @ApiProperty({ example: 'Perez' })
  apellido: string;

  @Expose()
  @ApiProperty({ example: 'juan@cosmeticos.com' })
  email: string;

  @Expose()
  @ApiProperty({ enum: Rol })
  rol: Rol;

  @Expose()
  @ApiProperty()
  activo: boolean;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  sedeId: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  telefono: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  avatarUrl: string | null;

  @Expose()
  @ApiPropertyOptional()
  permisosExtra: string[];

  @Expose()
  @ApiPropertyOptional()
  permisosRevocados: string[];

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  ultimoLogin: Date | null;

  @Expose()
  @ApiProperty()
  forzarCambioPassword: boolean;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  notas: string | null;

  @Expose()
  @ApiProperty()
  @Type(() => Date)
  createdAt: Date;

  @Expose()
  @ApiProperty()
  @Type(() => Date)
  updatedAt: Date;

  // ── campos NON-@Expose (excluidos automáticamente) ──
  // password, resetPasswordToken, resetPasswordExpires,
  // intentosFallidos, bloqueadoHasta, creadoPorId, tokenVersion, etc.

  constructor(partial: Partial<UsuarioResponseDto>) {
    Object.assign(this, partial);
  }
}
