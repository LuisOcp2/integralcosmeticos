import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions/permissions.constants';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UsuariosQueryDto } from './dto/usuarios-query.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ToggleUsuarioEstadoDto } from './dto/toggle-usuario-estado.dto';
import { CreateUsuarioAdminDto } from './dto/create-usuario-admin.dto';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('seed')
  @ApiOperation({ summary: 'Crear usuario admin inicial (solo si no existe ningun admin)' })
  async seed() {
    return this.usuariosService.seedAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Rol.ADMIN)
  @Permissions(PERMISSIONS.USUARIOS_CREAR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear usuario (solo Admin)' })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Post('admin-create')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Rol.ADMIN)
  @Permissions(PERMISSIONS.USUARIOS_CREAR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear usuario con password temporal (solo Admin)' })
  createByAdmin(@Body() dto: CreateUsuarioAdminDto) {
    return this.usuariosService.createByAdmin(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @Permissions(PERMISSIONS.USUARIOS_VER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuarios con filtros y paginacion' })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'rol', required: false, enum: Rol })
  @ApiQuery({ name: 'sedeId', required: false, type: String })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: UsuariosQueryDto) {
    return this.usuariosService.findAll(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.usuariosService.getMe(user.id);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contrasena del usuario autenticado' })
  changeOwnPassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.usuariosService.changeOwnPassword(user.id, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Rol.ADMIN, Rol.SUPERVISOR)
  @Permissions(PERMISSIONS.USUARIOS_VER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Rol.ADMIN)
  @Permissions(PERMISSIONS.USUARIOS_EDITAR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar usuario (solo Admin)' })
  update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  @Patch(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Rol.ADMIN)
  @Permissions(PERMISSIONS.USUARIOS_CAMBIAR_ESTADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activar o desactivar usuario (solo Admin)' })
  toggleEstado(@Param('id') id: string, @Body() dto: ToggleUsuarioEstadoDto) {
    return this.usuariosService.updateEstado(id, dto.activo);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Rol.ADMIN)
  @Permissions(PERMISSIONS.USUARIOS_CAMBIAR_ESTADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desactivar usuario (solo Admin)' })
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}
