import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';
import { CreateParametroConfiguracionDto } from './dto/create-parametro-configuracion.dto';
import { UpdateParametroConfiguracionDto } from './dto/update-parametro-configuracion.dto';
import { TipoDocumentoConfiguracion } from './entities/tipo-documento-configuracion.entity';
import { ParametroConfiguracion } from './entities/parametro-configuracion.entity';

type ParametroDefault = {
  clave: string;
  valor: string;
  tipoDato: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  modulo: string;
  descripcion: string;
};

const PARAMETROS_BASE: ParametroDefault[] = [
  {
    clave: 'empresa.nombre_comercial',
    valor: 'Integral Cosmeticos',
    tipoDato: 'STRING',
    modulo: 'empresa',
    descripcion: 'Nombre comercial mostrado en tickets y reportes',
  },
  {
    clave: 'empresa.nit',
    valor: '900000000-0',
    tipoDato: 'STRING',
    modulo: 'empresa',
    descripcion: 'NIT de la empresa para documentos comerciales',
  },
  {
    clave: 'venta.moneda',
    valor: 'COP',
    tipoDato: 'STRING',
    modulo: 'ventas',
    descripcion: 'Codigo ISO de moneda para operaciones de venta',
  },
  {
    clave: 'venta.iva_defecto',
    valor: '19',
    tipoDato: 'NUMBER',
    modulo: 'ventas',
    descripcion: 'Porcentaje de IVA por defecto en productos nuevos',
  },
  {
    clave: 'venta.permitir_descuento_libre',
    valor: 'true',
    tipoDato: 'BOOLEAN',
    modulo: 'ventas',
    descripcion: 'Permite al cajero ingresar descuentos manuales',
  },
  {
    clave: 'venta.descuento_maximo_porcentaje',
    valor: '25',
    tipoDato: 'NUMBER',
    modulo: 'ventas',
    descripcion: 'Limite maximo de descuento permitido en porcentaje',
  },
  {
    clave: 'ticket.prefijo_venta',
    valor: 'VTA',
    tipoDato: 'STRING',
    modulo: 'caja',
    descripcion: 'Prefijo usado en consecutivo de ventas',
  },
  {
    clave: 'ticket.mostrar_nit_cliente',
    valor: 'true',
    tipoDato: 'BOOLEAN',
    modulo: 'caja',
    descripcion: 'Controla si el ticket imprime identificacion del cliente',
  },
  {
    clave: 'inventario.stock_minimo_defecto',
    valor: '5',
    tipoDato: 'NUMBER',
    modulo: 'inventario',
    descripcion: 'Stock minimo por defecto para nuevas variantes',
  },
  {
    clave: 'inventario.alerta_critica_umbral',
    valor: '2',
    tipoDato: 'NUMBER',
    modulo: 'inventario',
    descripcion: 'Umbral para marcar stock en estado critico',
  },
  {
    clave: 'sync.intervalo_minutos',
    valor: '5',
    tipoDato: 'NUMBER',
    modulo: 'sync',
    descripcion: 'Intervalo base de sincronizacion cloud en minutos',
  },
  {
    clave: 'clientes.puntos_por_cada_1000',
    valor: '1',
    tipoDato: 'NUMBER',
    modulo: 'clientes',
    descripcion: 'Puntos de fidelidad entregados por cada 1000 COP vendidos',
  },
  {
    clave: 'clientes.tipo_documento_defecto',
    valor: 'CC',
    tipoDato: 'STRING',
    modulo: 'clientes',
    descripcion: 'Tipo de documento preseleccionado en formulario de cliente',
  },
  {
    clave: 'importaciones.modo_defecto',
    valor: 'crear_o_actualizar',
    tipoDato: 'STRING',
    modulo: 'importaciones',
    descripcion: 'Modo por defecto para importaciones de catalogo',
  },
  {
    clave: 'reportes.zona_horaria',
    valor: 'America/Bogota',
    tipoDato: 'STRING',
    modulo: 'reportes',
    descripcion: 'Zona horaria para consolidacion de reportes diarios',
  },
];

@Injectable()
export class ConfiguracionesService {
  private schemaInitialized: Promise<void> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TipoDocumentoConfiguracion)
    private readonly tiposDocumentoRepository: Repository<TipoDocumentoConfiguracion>,
    @InjectRepository(ParametroConfiguracion)
    private readonly parametrosRepository: Repository<ParametroConfiguracion>,
  ) {}

  async createTipoDocumento(dto: CreateTipoDocumentoDto): Promise<TipoDocumentoConfiguracion> {
    await this.ensureConfigTables();

    const codigo = dto.codigo.trim().toUpperCase();
    const nombre = dto.nombre.trim();

    const existente = await this.tiposDocumentoRepository.findOne({
      where: { codigo },
    });

    if (existente?.activo) {
      throw new ConflictException('Ya existe un tipo de documento activo con ese codigo');
    }

    if (existente && !existente.activo) {
      existente.codigo = codigo;
      existente.nombre = nombre;
      existente.descripcion = dto.descripcion?.trim() || undefined;
      existente.activo = true;
      return this.tiposDocumentoRepository.save(existente);
    }

    const tipoDocumento = this.tiposDocumentoRepository.create({
      codigo,
      nombre,
      descripcion: dto.descripcion?.trim() || undefined,
    });

    return this.tiposDocumentoRepository.save(tipoDocumento);
  }

  async findAllTiposDocumento(activosSolo = true): Promise<TipoDocumentoConfiguracion[]> {
    await this.ensureConfigTables();
    await this.ensureTiposDocumentoBase();

    return this.tiposDocumentoRepository.find({
      where: activosSolo ? { activo: true } : undefined,
      order: { nombre: 'ASC' },
    });
  }

  async findTipoDocumentoById(id: string): Promise<TipoDocumentoConfiguracion> {
    await this.ensureConfigTables();

    const tipoDocumento = await this.tiposDocumentoRepository.findOne({ where: { id } });
    if (!tipoDocumento) {
      throw new NotFoundException('Tipo de documento no encontrado');
    }
    return tipoDocumento;
  }

  async updateTipoDocumento(
    id: string,
    dto: UpdateTipoDocumentoDto,
  ): Promise<TipoDocumentoConfiguracion> {
    await this.ensureConfigTables();

    const tipoDocumento = await this.findTipoDocumentoById(id);

    if (dto.codigo) {
      const codigoNormalizado = dto.codigo.trim().toUpperCase();
      if (codigoNormalizado !== tipoDocumento.codigo) {
        const existeCodigo = await this.tiposDocumentoRepository.findOne({
          where: { codigo: codigoNormalizado, activo: true },
        });
        if (existeCodigo && existeCodigo.id !== tipoDocumento.id) {
          throw new ConflictException('Ya existe un tipo de documento activo con ese codigo');
        }
      }
      tipoDocumento.codigo = codigoNormalizado;
    }

    if (dto.nombre !== undefined) {
      tipoDocumento.nombre = dto.nombre.trim();
    }

    if (dto.descripcion !== undefined) {
      tipoDocumento.descripcion = dto.descripcion?.trim() || undefined;
    }

    return this.tiposDocumentoRepository.save(tipoDocumento);
  }

  async removeTipoDocumento(id: string): Promise<void> {
    await this.ensureConfigTables();

    const tipoDocumento = await this.findTipoDocumentoById(id);
    tipoDocumento.activo = false;
    await this.tiposDocumentoRepository.save(tipoDocumento);
  }

  async createParametro(dto: CreateParametroConfiguracionDto): Promise<ParametroConfiguracion> {
    await this.ensureConfigTables();

    const clave = dto.clave.trim().toLowerCase();

    const existente = await this.parametrosRepository.findOne({
      where: { clave },
    });

    if (existente?.activo) {
      throw new ConflictException('Ya existe un parametro activo con esa clave');
    }

    if (existente && !existente.activo) {
      existente.valor = dto.valor?.trim() || null;
      existente.descripcion = dto.descripcion?.trim() || undefined;
      existente.tipoDato = dto.tipoDato;
      existente.modulo = dto.modulo?.trim().toLowerCase() || undefined;
      existente.activo = true;
      return this.parametrosRepository.save(existente);
    }

    const parametro = this.parametrosRepository.create({
      clave,
      valor: dto.valor?.trim() || null,
      descripcion: dto.descripcion?.trim() || undefined,
      tipoDato: dto.tipoDato,
      modulo: dto.modulo?.trim().toLowerCase() || undefined,
    });

    return this.parametrosRepository.save(parametro);
  }

  async findAllParametros(activosSolo = true): Promise<ParametroConfiguracion[]> {
    await this.ensureConfigTables();
    await this.ensureParametrosBase();

    return this.parametrosRepository.find({
      where: activosSolo ? { activo: true } : undefined,
      order: { clave: 'ASC' },
    });
  }

  async findParametroById(id: string): Promise<ParametroConfiguracion> {
    await this.ensureConfigTables();

    const parametro = await this.parametrosRepository.findOne({ where: { id } });
    if (!parametro) {
      throw new NotFoundException('Parametro de configuracion no encontrado');
    }
    return parametro;
  }

  async findParametroByClave(clave: string): Promise<ParametroConfiguracion> {
    await this.ensureConfigTables();
    await this.ensureParametrosBase();

    const claveNormalizada = clave.trim().toLowerCase();
    const parametro = await this.parametrosRepository.findOne({
      where: { clave: claveNormalizada, activo: true },
    });
    if (!parametro) {
      throw new NotFoundException('Parametro de configuracion no encontrado para la clave enviada');
    }
    return parametro;
  }

  async updateParametro(
    id: string,
    dto: UpdateParametroConfiguracionDto,
  ): Promise<ParametroConfiguracion> {
    await this.ensureConfigTables();

    const parametro = await this.findParametroById(id);

    if (dto.clave) {
      const claveNormalizada = dto.clave.trim().toLowerCase();
      if (claveNormalizada !== parametro.clave) {
        const existente = await this.parametrosRepository.findOne({
          where: { clave: claveNormalizada, activo: true },
        });
        if (existente && existente.id !== parametro.id) {
          throw new ConflictException('Ya existe un parametro activo con esa clave');
        }
      }
      parametro.clave = claveNormalizada;
    }

    if (dto.valor !== undefined) {
      parametro.valor = dto.valor?.trim() || null;
    }

    if (dto.descripcion !== undefined) {
      parametro.descripcion = dto.descripcion?.trim() || undefined;
    }

    if (dto.tipoDato !== undefined) {
      parametro.tipoDato = dto.tipoDato;
    }

    if (dto.modulo !== undefined) {
      parametro.modulo = dto.modulo?.trim().toLowerCase() || undefined;
    }

    return this.parametrosRepository.save(parametro);
  }

  async removeParametro(id: string): Promise<void> {
    await this.ensureConfigTables();

    const parametro = await this.findParametroById(id);
    parametro.activo = false;
    await this.parametrosRepository.save(parametro);
  }

  async bootstrapParametrosBase() {
    await this.ensureConfigTables();

    let created = 0;
    let reactivated = 0;

    for (const item of PARAMETROS_BASE) {
      const existente = await this.parametrosRepository.findOne({
        where: { clave: item.clave },
      });

      if (!existente) {
        const nuevo = this.parametrosRepository.create({
          clave: item.clave,
          valor: item.valor,
          tipoDato: item.tipoDato,
          modulo: item.modulo,
          descripcion: item.descripcion,
          activo: true,
        });
        await this.parametrosRepository.save(nuevo);
        created += 1;
        continue;
      }

      if (!existente.activo) {
        existente.valor = existente.valor ?? item.valor;
        existente.tipoDato = existente.tipoDato || item.tipoDato;
        existente.modulo = existente.modulo || item.modulo;
        existente.descripcion = existente.descripcion || item.descripcion;
        existente.activo = true;
        await this.parametrosRepository.save(existente);
        reactivated += 1;
      }
    }

    return {
      total: PARAMETROS_BASE.length,
      created,
      reactivated,
      untouched: PARAMETROS_BASE.length - created - reactivated,
    };
  }

  async getHealth() {
    await this.ensureConfigTables();

    const [tiposDocumentoActivos, parametrosActivos] = await Promise.all([
      this.tiposDocumentoRepository.count({ where: { activo: true } }),
      this.parametrosRepository.count({ where: { activo: true } }),
    ]);

    return {
      ok: true,
      tablas: {
        tipos_documento_configuracion: true,
        parametros_configuracion: true,
      },
      activos: {
        tiposDocumento: tiposDocumentoActivos,
        parametros: parametrosActivos,
      },
    };
  }

  private async ensureConfigTables(): Promise<void> {
    if (!this.schemaInitialized) {
      this.schemaInitialized = this.createConfigTablesIfNeeded();
    }

    await this.schemaInitialized;
  }

  private async ensureParametrosBase(): Promise<void> {
    const activos = await this.parametrosRepository.count({ where: { activo: true } });
    if (activos > 0) {
      return;
    }

    await this.bootstrapParametrosBase();
  }

  private async createConfigTablesIfNeeded(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS tipos_documento_configuracion (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        codigo varchar(20) NOT NULL UNIQUE,
        nombre varchar(100) NOT NULL,
        descripcion text,
        activo boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS parametros_configuracion (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clave varchar(120) NOT NULL UNIQUE,
        valor text,
        descripcion text,
        tipo_dato varchar(20) NOT NULL DEFAULT 'STRING',
        modulo varchar(60),
        activo boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  private async ensureTiposDocumentoBase(): Promise<void> {
    const activos = await this.tiposDocumentoRepository.count({ where: { activo: true } });
    if (activos > 0) {
      return;
    }

    const defaults = [
      { codigo: 'CC', nombre: 'Cedula de Ciudadania' },
      { codigo: 'NIT', nombre: 'Numero de Identificacion Tributaria' },
      { codigo: 'CE', nombre: 'Cedula de Extranjeria' },
      { codigo: 'PP', nombre: 'Pasaporte' },
    ];

    for (const item of defaults) {
      const existente = await this.tiposDocumentoRepository.findOne({
        where: { codigo: item.codigo },
      });

      if (existente) {
        existente.nombre = item.nombre;
        existente.activo = true;
        await this.tiposDocumentoRepository.save(existente);
      } else {
        const nuevo = this.tiposDocumentoRepository.create({
          codigo: item.codigo,
          nombre: item.nombre,
          activo: true,
        });
        await this.tiposDocumentoRepository.save(nuevo);
      }
    }
  }
}
