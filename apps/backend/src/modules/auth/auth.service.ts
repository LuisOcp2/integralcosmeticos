import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string, ip?: string) {
    const usuario = await this.usuariosService.findByEmail(email);
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');
    if (!usuario.activo) throw new UnauthorizedException('Usuario inactivo');

    if (this.usuariosService.esBloqueado(usuario)) {
      throw new UnauthorizedException('Usuario temporalmente bloqueado. Intente mas tarde');
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      await this.usuariosService.registrarIntentoFallido(email, ip);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.usuariosService.registrarLoginExitoso(usuario.id, ip);

    const { password: _pass, ...result } = usuario;
    return result;
  }

  async login(usuario: any, ip?: string) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      sedeId: usuario.sedeId,
      empresaId: usuario.empresaId,
      permisosExtra: usuario.permisosExtra ?? [],
      permisosRevocados: usuario.permisosRevocados ?? [],
    };

    return {
      accessToken: this.jwtService.sign(payload),
      usuario,
    };
  }
}
