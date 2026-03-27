import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { SedesModule } from './modules/sedes/sedes.module';
import { CategoriasModule } from './modules/catalogo/categorias/categorias.module';
import { MarcasModule } from './modules/catalogo/marcas/marcas.module';
import { ProductosModule } from './modules/catalogo/productos/productos.module';
import { VariantesModule } from './modules/catalogo/variantes/variantes.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { CajaModule } from './modules/caja/caja.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { SyncModule } from './modules/sync/sync.module';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [databaseConfig, appConfig],
    }),

    // Base de datos
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('app.nodeEnv') !== 'production',
        logging: configService.get<string>('app.nodeEnv') === 'local',
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),

    // Infraestructura
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST') ?? '127.0.0.1',
          port: Number(configService.get<string>('REDIS_PORT') ?? 6379),
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Módulos del sistema
    AuthModule,
    UsuariosModule,
    SedesModule,
    CategoriasModule,
    MarcasModule,
    ProductosModule,
    VariantesModule,
    InventarioModule,
    CajaModule,
    VentasModule,
    ClientesModule,
    ReportesModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
