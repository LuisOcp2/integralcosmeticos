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

  async validateUser(email: string, password: string) {
    const usuario = await this.usuariosService.findByEmail(email);
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');
    if (!usuario.activo) throw new UnauthorizedException('Usuario inactivo');

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) throw new UnauthorizedException('Credenciales inválidas');

    const { password: _pass, ...result } = usuario;
    return result;
  }

  async login(usuario: any) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      sedeId: usuario.sedeId,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      usuario,
    };
  }
}
