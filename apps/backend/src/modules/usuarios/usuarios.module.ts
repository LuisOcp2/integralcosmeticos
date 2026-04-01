import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { AuditoriaUsuario } from './entities/auditoria-usuario.entity';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { PermisosGuard } from '../auth/guards/permisos.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, AuditoriaUsuario])],
  controllers: [UsuariosController],
  providers: [UsuariosService, PermisosGuard],
  exports: [UsuariosService],
})
export class UsuariosModule {}
