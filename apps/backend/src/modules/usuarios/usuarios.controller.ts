import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Put,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
  ForbiddenException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { ResetPasswordAdminDto } from './dto/reset-password-admin.dto';
import { GestionarPermisosDto } from './dto/gestionar-permisos.dto';
import { FiltrosUsuarioDto } from './dto/filtros-usuario.dto';
import { CambiarRolDto } from './dto/cambiar-rol.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermisosGuard } from '../auth/guards/permisos.guard';
import { Permisos } from '../auth/decorators/permisos.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Rol, Permiso } from '@cosmeticos/shared-types';

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crear admin inicial (solo si no existe ningun ADMIN)' })
  seed() {
    return this.usuariosService.seedAdmin();
  }

  @Get('estadisticas')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_VER)
  @ApiOperation({ summary: 'Estadisticas generales del modulo de usuarios' })
  getEstadisticas() {
    return this.usuariosService.getEstadisticas();
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_VER)
  @ApiOperation({ summary: 'Listar usuarios con filtros y paginacion' })
  findAll(@Query() filtros: FiltrosUsuarioDto) {
    return this.usuariosService.findAll(filtros);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_CREAR)
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @ApiCreatedResponse({ description: 'Usuario creado exitosamente' })
  create(@Body() dto: CreateUsuarioDto, @Req() req: Request & { user: any }) {
    return this.usuariosService.create(dto, req.user?.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.usuariosService.findOne(user.id);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar contrasena del usuario autenticado' })
  cambiarPasswordPropia(@CurrentUser() user: AuthUser, @Body() dto: CambiarPasswordDto) {
    return this.usuariosService.cambiarPassword(user.id, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_VER)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_EDITAR)
  @ApiOperation({ summary: 'Actualizar datos del usuario' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsuarioDto,
    @Req() req: Request & { user: any },
  ) {
    return this.usuariosService.update(id, dto, req.user?.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_ELIMINAR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar usuario (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request & { user: any }) {
    return this.usuariosService.remove(id, req.user?.id);
  }

  @Patch(':id/activar')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_EDITAR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivar usuario desactivado' })
  activar(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request & { user: any }) {
    return this.usuariosService.activar(id, req.user?.id);
  }

  @Patch(':id/cambiar-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar contrasena propia (requiere contrasena actual)' })
  cambiarPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarPasswordDto,
    @Req() req: Request & { user: any },
  ) {
    if (req.user.id !== id && req.user.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo puedes cambiar tu propia contrasena');
    }
    return this.usuariosService.cambiarPassword(id, dto);
  }

  @Post(':id/reset-password')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_RESET_PASSWORD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetear contrasena de cualquier usuario (solo admin/supervisor)' })
  resetPasswordAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordAdminDto,
    @Req() req: Request & { user: any },
  ) {
    return this.usuariosService.resetPasswordAdmin(id, dto, req.user?.id);
  }

  @Post(':id/bloquear')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_EDITAR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bloquear usuario temporalmente' })
  bloquear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('minutos') minutos: number = 30,
    @Req() req: Request & { user: any },
  ) {
    return this.usuariosService.bloquear(id, minutos, req.user?.id);
  }

  @Post(':id/desbloquear')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_EDITAR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desbloquear usuario bloqueado' })
  desbloquear(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request & { user: any }) {
    return this.usuariosService.desbloquear(id, req.user?.id);
  }

  @Put(':id/permisos')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_CAMBIAR_ROL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gestionar permisos extra y revocados del usuario' })
  gestionarPermisos(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GestionarPermisosDto,
    @Req() req: Request & { user: any },
  ) {
    return this.usuariosService.gestionarPermisos(id, dto, req.user?.id);
  }

  @Get(':id/permisos')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_VER)
  @ApiOperation({ summary: 'Ver permisos efectivos de un usuario (rol + extra - revocados)' })
  getPermisosEfectivos(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.getPermisosEfectivos(id);
  }

  @Get(':id/auditoria')
  @UseGuards(JwtAuthGuard, PermisosGuard)
  @Permisos(Permiso.USUARIOS_VER_AUDITORIA)
  @ApiOperation({ summary: 'Ver log de auditoria de un usuario' })
  getAuditoria(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.usuariosService.getAuditoria(id, page, limit);
  }

  @Patch(':id/rol')
  @UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
  @Roles(Rol.ADMIN)
  @Permisos(Permiso.USUARIOS_CAMBIAR_ROL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cambiar rol de usuario',
    description:
      'Solo ADMIN puede cambiar roles. Incrementa tokenVersion invalidando todos los JWT existentes del usuario afectado.',
  })
  @ApiOkResponse({ description: 'Rol cambiado correctamente' })
  cambiarRol(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarRolDto,
    @Req() req: Request & { user: any },
  ) {
    return this.usuariosService.cambiarRol(id, dto, req.user.id);
  }
}
