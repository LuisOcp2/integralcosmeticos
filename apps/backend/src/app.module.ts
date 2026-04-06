import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import KeyvRedis from '@keyv/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { SedesModule } from './modules/sedes/sedes.module';
import { CategoriasModule } from './modules/catalogo/categorias/categorias.module';
import { MarcasModule } from './modules/catalogo/marcas/marcas.module';
import { ProductosModule } from './modules/catalogo/productos/productos.module';
import { VariantesModule } from './modules/catalogo/variantes/variantes.module';
import { ImportacionesModule } from './modules/catalogo/importaciones/importaciones.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { CajaModule } from './modules/caja/caja.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { SyncModule } from './modules/sync/sync.module';
import { ConfiguracionesModule } from './modules/configuraciones/configuraciones.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { OrdenComprasModule } from './modules/orden-compras/orden-compras.module';
import { ContabilidadModule } from './modules/contabilidad/contabilidad.module';
import { CrmModule } from './modules/crm/crm.module';
import { ComercialModule } from './modules/comercial/comercial.module';
import { FinanzasModule } from './modules/finanzas/finanzas.module';
import { RrhhModule } from './modules/rrhh/rrhh.module';
import { ActivosModule } from './modules/activos/activos.module';
import { ProyectosModule } from './modules/proyectos/proyectos.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { OmnicanalModule } from './modules/omnicanal/omnicanal.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { SuperadminModule } from './modules/superadmin/superadmin.module';
import { AuditoriaInterceptor } from './modules/superadmin/interceptors/auditoria.interceptor';
import { IntegracionesModule } from './modules/integraciones/integraciones.module';
import { VerticalesModule } from './modules/verticales/verticales.module';
import { Producto } from './modules/catalogo/productos/entities/producto.entity';
import { Variante } from './modules/catalogo/variantes/entities/variante.entity';
import { Categoria } from './modules/catalogo/categorias/entities/categoria.entity';
import { Marca } from './modules/catalogo/marcas/entities/marca.entity';
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
        entities: [Producto, Variante, Categoria, Marca, __dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('database.synchronize') ?? false,
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
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') ?? '127.0.0.1';
        const port = Number(configService.get<string>('REDIS_PORT') ?? 6379);

        return {
          stores: [new KeyvRedis(`redis://${host}:${port}`)],
        };
      },
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
    ImportacionesModule,
    InventarioModule,
    CajaModule,
    VentasModule,
    ClientesModule,
    ReportesModule,
    SyncModule,
    ConfiguracionesModule,
    ProveedoresModule,
    OrdenComprasModule,
    ContabilidadModule,
    CrmModule,
    ComercialModule,
    FinanzasModule,
    RrhhModule,
    ActivosModule,
    ProyectosModule,
    DocumentosModule,
    NotificacionesModule,
    OmnicanalModule,
    WorkflowsModule,
    SuperadminModule,
    IntegracionesModule,
    VerticalesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ThrottlerGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaInterceptor,
    },
  ],
})
export class AppModule {}
