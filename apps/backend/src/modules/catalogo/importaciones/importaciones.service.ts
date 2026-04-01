import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bull';
import { DataSource, In, Repository } from 'typeorm';
import { Categoria } from '../categorias/entities/categoria.entity';
import { Marca } from '../marcas/entities/marca.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Variante } from '../variantes/entities/variante.entity';
import { ModoImportacion } from './dto/validar-importacion.dto';
import {
  EstadoImportacionCatalogo,
  ImportacionCatalogoJob,
} from './entities/importacion-catalogo-job.entity';
import {
  EstadoImportacionCatalogoRow,
  ImportacionCatalogoRow,
} from './entities/importacion-catalogo-row.entity';
import {
  ImportRowError,
  ImportRowIssue,
  ImportRowRaw,
  ImportValidationJobResult,
  ImportValidationResult,
  ImportValidationSummary,
  NormalizedImportRow,
} from './interfaces/importacion-catalogo.interfaces';

const CATALOG_IMPORT_QUEUE = 'catalogo-import';
const PROCESS_JOB_NAME = 'process-import-job';
const TEMPLATE_HEADERS = [
  'codigoInterno',
  'nombreProducto',
  'descripcionProducto',
  'imagenProductoUrl',
  'categoria',
  'marca',
  'precioVentaProducto',
  'precioCostoProducto',
  'iva',
  'nombreVariante',
  'sku',
  'codigoBarras',
  'precioExtra',
  'precioVentaVariante',
  'precioCostoVariante',
  'imagenVarianteUrl',
];
const TEMPLATE_EXAMPLE = [
  'PROD-LABIAL-MATE',
  'Labial Mate',
  'Labial de larga duracion',
  'https://cdn.ejemplo.com/labial.png',
  'Maquillaje',
  'Loreal',
  '25000',
  '12000',
  '19',
  'Tono Rojo Intenso',
  '',
  '',
  '2000',
  '',
  '',
  'https://cdn.ejemplo.com/labial-rojo.png',
];

@Injectable()
export class ImportacionesService {
  private schemaReadyPromise: Promise<void> | null = null;

  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
    @InjectRepository(Marca)
    private readonly marcasRepository: Repository<Marca>,
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @InjectRepository(Variante)
    private readonly variantesRepository: Repository<Variante>,
    @InjectRepository(ImportacionCatalogoJob)
    private readonly importJobsRepository: Repository<ImportacionCatalogoJob>,
    @InjectRepository(ImportacionCatalogoRow)
    private readonly importRowsRepository: Repository<ImportacionCatalogoRow>,
    @InjectQueue(CATALOG_IMPORT_QUEUE)
    private readonly catalogImportQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  private async ensureSchemaReady(): Promise<void> {
    if (!this.schemaReadyPromise) {
      this.schemaReadyPromise = this.createSchemaIfNeeded();
    }
    return this.schemaReadyPromise;
  }

  private async createSchemaIfNeeded(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "importaciones_catalogo_jobs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "filename" varchar(255) NOT NULL,
        "format" varchar(10) NOT NULL,
        "mode" varchar(40) NOT NULL DEFAULT 'crear_o_actualizar',
        "dryRun" boolean NOT NULL DEFAULT true,
        "status" varchar(40) NOT NULL DEFAULT 'UPLOADED',
        "totalRows" integer NOT NULL DEFAULT 0,
        "validRows" integer NOT NULL DEFAULT 0,
        "errorRows" integer NOT NULL DEFAULT 0,
        "processedRows" integer NOT NULL DEFAULT 0,
        "createdProducts" integer NOT NULL DEFAULT 0,
        "updatedProducts" integer NOT NULL DEFAULT 0,
        "createdVariants" integer NOT NULL DEFAULT 0,
        "updatedVariants" integer NOT NULL DEFAULT 0,
        "errorMessage" text NULL,
        "summary" jsonb NULL,
        "startedAt" timestamp NULL,
        "finishedAt" timestamp NULL,
        "createdBy" uuid NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "importaciones_catalogo_rows" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "jobId" uuid NOT NULL,
        "rowNumber" integer NOT NULL,
        "rawData" jsonb NOT NULL,
        "normalizedData" jsonb NULL,
        "status" varchar(30) NOT NULL DEFAULT 'VALID',
        "errorCode" text NULL,
        "errorMessage" text NULL,
        "productId" uuid NULL,
        "variantId" uuid NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_import_rows_job" FOREIGN KEY ("jobId")
          REFERENCES "importaciones_catalogo_jobs"("id") ON DELETE CASCADE
      );
    `);

    await this.dataSource.query(
      'CREATE INDEX IF NOT EXISTS "idx_import_rows_job" ON "importaciones_catalogo_rows" ("jobId");',
    );
  }

  async createImportJobFromFile(
    file: { originalname: string; buffer: Buffer },
    options: { dryRun?: boolean; modo?: ModoImportacion; createdBy?: string },
  ): Promise<ImportValidationJobResult> {
    await this.ensureSchemaReady();

    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo CSV o XLSX');
    }

    const mode = options.modo ?? ModoImportacion.CREAR_O_ACTUALIZAR;
    const dryRun = options.dryRun ?? true;

    const rows = this.parseRowsFromFile(file);
    if (!rows.length) {
      throw new UnprocessableEntityException('El archivo no contiene filas de datos');
    }

    const categorias = await this.categoriasRepository.find({ where: { activo: true } });
    const marcas = await this.marcasRepository.find({ where: { activo: true } });

    const categoriaMap = new Map(
      categorias.map((item) => [this.normalizarTexto(item.nombre), item.id]),
    );
    const marcaMap = new Map(marcas.map((item) => [this.normalizarTexto(item.nombre), item.id]));

    const errors: ImportRowError[] = [];
    const normalizedRows: NormalizedImportRow[] = [];
    const rowEntities: ImportacionCatalogoRow[] = [];

    const job = await this.importJobsRepository.save(
      this.importJobsRepository.create({
        filename: file.originalname,
        format: file.originalname.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv',
        mode,
        dryRun,
        status: EstadoImportacionCatalogo.UPLOADED,
        createdBy: options.createdBy,
      }),
    );

    for (const raw of rows) {
      const rowIssues: ImportRowIssue[] = [];
      const normalized = this.normalizeRow(raw, rowIssues);

      if (normalized) {
        const categoriaId = categoriaMap.get(this.normalizarTexto(normalized.categoria));
        const marcaId = marcaMap.get(this.normalizarTexto(normalized.marca));

        if (!categoriaId) {
          rowIssues.push({
            code: 'CATEGORIA_NO_EXISTE',
            message: `Categoria '${normalized.categoria}' no existe o esta inactiva`,
          });
        }

        if (!marcaId) {
          rowIssues.push({
            code: 'MARCA_NO_EXISTE',
            message: `Marca '${normalized.marca}' no existe o esta inactiva`,
          });
        }

        if (!rowIssues.length) {
          normalizedRows.push(normalized);
        }
      }

      errors.push(
        ...rowIssues.map((issue) => ({
          rowNumber: raw.rowNumber,
          ...issue,
        })),
      );

      const rowEntity = {
        jobId: job.id,
        rowNumber: raw.rowNumber,
        rawData: raw as any,
        normalizedData: (normalized ?? undefined) as any,
        status: rowIssues.length
          ? EstadoImportacionCatalogoRow.INVALID
          : EstadoImportacionCatalogoRow.VALID,
        errorCode: rowIssues[0]?.code,
        errorMessage: rowIssues.map((item) => item.message).join('; ') || undefined,
      } as ImportacionCatalogoRow;

      rowEntities.push(rowEntity);
    }

    const duplicateErrors = this.detectDuplicateRows(normalizedRows);
    errors.push(...duplicateErrors);

    const duplicateRowNumbers = new Set(duplicateErrors.map((item) => item.rowNumber));
    rowEntities.forEach((entity) => {
      if (duplicateRowNumbers.has(entity.rowNumber)) {
        const duplicate = duplicateErrors.find((item) => item.rowNumber === entity.rowNumber);
        entity.status = EstadoImportacionCatalogoRow.INVALID;
        entity.errorCode = duplicate?.code;
        entity.errorMessage = duplicate?.message;
      }
    });

    const validRowNumbers = new Set(
      normalizedRows
        .map((row) => row.rowNumber)
        .filter((rowNumber) => !errors.some((error) => error.rowNumber === rowNumber)),
    );

    const validRows = normalizedRows.filter((row) => validRowNumbers.has(row.rowNumber));
    const summary = await this.buildSummary(validRows, rows.length, errors, mode);

    await this.importRowsRepository.save(rowEntities as any);

    const nextStatus = errors.length
      ? EstadoImportacionCatalogo.COMPLETED_WITH_ERRORS
      : EstadoImportacionCatalogo.VALIDATED;

    await this.importJobsRepository.update(job.id, {
      status: nextStatus,
      totalRows: summary.totalRows,
      validRows: summary.validRows,
      errorRows: summary.rowsWithErrors,
      summary: summary as any,
      finishedAt: new Date(),
    });

    const validation: ImportValidationResult = {
      dryRun,
      mode,
      summary,
      errors: errors.sort((a, b) => a.rowNumber - b.rowNumber),
      normalizedRowsPreview: validRows.slice(0, 20),
    };

    return {
      jobId: job.id,
      status: nextStatus,
      ...validation,
    };
  }

  async executeImport(jobId: string): Promise<{ jobId: string; queued: boolean; dryRun: boolean }> {
    await this.ensureSchemaReady();

    const job = await this.importJobsRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job de importacion no encontrado');
    }

    if (job.dryRun) {
      return { jobId, queued: false, dryRun: true };
    }

    if (
      [EstadoImportacionCatalogo.PROCESSING, EstadoImportacionCatalogo.COMPLETED].includes(
        job.status,
      )
    ) {
      return { jobId, queued: false, dryRun: false };
    }

    await this.importJobsRepository.update(jobId, {
      status: EstadoImportacionCatalogo.PROCESSING,
      startedAt: new Date(),
      errorMessage: undefined,
    });

    await this.catalogImportQueue.add(
      PROCESS_JOB_NAME,
      { jobId },
      { attempts: 3, removeOnComplete: true },
    );

    return { jobId, queued: true, dryRun: false };
  }

  async processImportJob(jobId: string): Promise<void> {
    await this.ensureSchemaReady();

    const importJob = await this.importJobsRepository.findOne({ where: { id: jobId } });
    if (!importJob) {
      throw new NotFoundException('Job de importacion no encontrado');
    }

    const rows = await this.importRowsRepository.find({
      where: {
        jobId,
        status: In([EstadoImportacionCatalogoRow.VALID, EstadoImportacionCatalogoRow.ERROR]),
      },
      order: { rowNumber: 'ASC' },
    });

    let createdProducts = 0;
    let updatedProducts = 0;
    let createdVariants = 0;
    let updatedVariants = 0;
    let processedRows = 0;
    let errorRows = 0;

    const chunkSize = 200;
    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);

      for (const row of chunk) {
        const normalized = row.normalizedData as unknown as NormalizedImportRow | null;
        if (!normalized) {
          row.status = EstadoImportacionCatalogoRow.ERROR;
          row.errorCode = row.errorCode ?? 'NORMALIZACION_INVALIDA';
          row.errorMessage = row.errorMessage ?? 'Fila no normalizada';
          errorRows += 1;
          continue;
        }

        try {
          const outcome = await this.applyRow(normalized, importJob.mode);
          row.status = outcome.action;
          row.productId = outcome.productId;
          row.variantId = outcome.variantId;
          row.errorCode = undefined;
          row.errorMessage = undefined;

          if (outcome.productAction === 'CREATED') createdProducts += 1;
          if (outcome.productAction === 'UPDATED') updatedProducts += 1;
          if (outcome.variantAction === 'CREATED') createdVariants += 1;
          if (outcome.variantAction === 'UPDATED') updatedVariants += 1;

          processedRows += 1;
        } catch (error) {
          row.status = EstadoImportacionCatalogoRow.ERROR;
          row.errorCode = 'APPLY_ERROR';
          row.errorMessage =
            error instanceof Error ? error.message : 'Error desconocido al aplicar fila';
          errorRows += 1;
        }
      }

      await this.importRowsRepository.save(chunk);
      await this.importJobsRepository.update(jobId, {
        processedRows,
        createdProducts,
        updatedProducts,
        createdVariants,
        updatedVariants,
        errorRows,
      });
    }

    await this.importJobsRepository.update(jobId, {
      status:
        errorRows > 0
          ? EstadoImportacionCatalogo.COMPLETED_WITH_ERRORS
          : EstadoImportacionCatalogo.COMPLETED,
      processedRows,
      createdProducts,
      updatedProducts,
      createdVariants,
      updatedVariants,
      errorRows,
      finishedAt: new Date(),
    });
  }

  async getImportJobStatus(jobId: string) {
    await this.ensureSchemaReady();

    const job = await this.importJobsRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job de importacion no encontrado');
    }

    return job;
  }

  async getImportJobReport(jobId: string) {
    await this.ensureSchemaReady();

    const job = await this.getImportJobStatus(jobId);
    const rows = await this.importRowsRepository.find({
      where: { jobId },
      order: { rowNumber: 'ASC' },
    });

    return {
      job,
      rows,
    };
  }

  async getImportJobErrorsCsv(jobId: string) {
    const report = await this.getImportJobReport(jobId);
    const errorRows = report.rows.filter((row) =>
      [EstadoImportacionCatalogoRow.INVALID, EstadoImportacionCatalogoRow.ERROR].includes(
        row.status as EstadoImportacionCatalogoRow,
      ),
    );

    const headers = [
      'rowNumber',
      'status',
      'errorCode',
      'errorMessage',
      'codigoInterno',
      'nombreProducto',
      'nombreVariante',
      'sku',
      'codigoBarras',
    ];
    const csvLines = [
      headers.join(';'),
      ...errorRows.map((row) => {
        const escape = (value?: string | number) => {
          const text = String(value ?? '').replace(/"/g, '""');
          return `"${text}"`;
        };

        return [
          escape(row.rowNumber),
          escape(row.status),
          escape(row.errorCode),
          escape(row.errorMessage),
          escape(row.normalizedData?.codigoInterno),
          escape(row.normalizedData?.nombreProducto),
          escape(row.normalizedData?.nombreVariante),
          escape(row.normalizedData?.sku),
          escape(row.normalizedData?.codigoBarras),
        ].join(';');
      }),
    ];

    return {
      filename: `importacion-${jobId}-errores.csv`,
      mimeType: 'text/csv; charset=utf-8',
      totalErrorRows: errorRows.length,
      base64: Buffer.from(`${csvLines.join('\n')}\n`, 'utf-8').toString('base64'),
    };
  }

  async listImportJobs(limit = 20) {
    await this.ensureSchemaReady();

    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 20;
    return this.importJobsRepository.find({
      order: { createdAt: 'DESC' },
      take: safeLimit,
    });
  }

  async getHealth() {
    await this.ensureSchemaReady();

    const [jobsTable, rowsTable] = await Promise.all([
      this.dataSource.query(
        `SELECT to_regclass('public.importaciones_catalogo_jobs') AS regclass;`,
      ),
      this.dataSource.query(
        `SELECT to_regclass('public.importaciones_catalogo_rows') AS regclass;`,
      ),
    ]);

    let queueOk = false;
    let queueInfo = 'unknown';
    try {
      const pong = await this.catalogImportQueue.client.ping();
      queueOk = pong === 'PONG';
      queueInfo = pong;
    } catch (error) {
      queueOk = false;
      queueInfo = error instanceof Error ? error.message : 'queue ping failed';
    }

    const jobsReady = Boolean(jobsTable?.[0]?.regclass);
    const rowsReady = Boolean(rowsTable?.[0]?.regclass);

    return {
      ok: jobsReady && rowsReady && queueOk,
      database: {
        importJobsTableReady: jobsReady,
        importRowsTableReady: rowsReady,
      },
      queue: {
        ready: queueOk,
        ping: queueInfo,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async importarCsvCatalogo(file: { originalname: string; buffer: Buffer }): Promise<{
    importados: number;
    errores: Array<{ fila: number; motivo: string }>;
  }> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo CSV');
    }

    const rows = this.parseCsv(file.buffer);
    if (!rows.length) {
      return { importados: 0, errores: [{ fila: 0, motivo: 'El archivo no contiene datos' }] };
    }

    const columnas = Object.keys(rows[0] ?? {}).filter((col) => col !== 'rowNumber');
    const columnasNormalizadas = new Set(columnas.map((col) => col.trim().toLowerCase()));
    const requeridas = ['nombre', 'precio', 'categoria', 'marca', 'sku'];
    const faltantes = requeridas.filter((col) => !columnasNormalizadas.has(col));

    if (faltantes.length) {
      return {
        importados: 0,
        errores: [
          {
            fila: 1,
            motivo: `Columnas requeridas faltantes: ${faltantes.join(', ')}`,
          },
        ],
      };
    }

    const errores: Array<{ fila: number; motivo: string }> = [];
    const skuVistos = new Set<string>();

    type FilaImportacion = {
      fila: number;
      nombre: string;
      precio: number;
      categoria: string;
      marca: string;
      sku: string;
      codigoBarra?: string;
      imagenUrl?: string;
      descripcion?: string;
    };

    const filasValidas: FilaImportacion[] = [];

    for (const row of rows) {
      const fila = Number(row.rowNumber);
      const nombre = String(row.nombre ?? '').trim();
      const categoria = String(row.categoria ?? '').trim();
      const marca = String(row.marca ?? '').trim();
      const sku = String(row.sku ?? '').trim();
      const precioRaw = String(row.precio ?? '')
        .trim()
        .replace(',', '.');
      const precio = Number(precioRaw);
      const codigoBarra = String(row.codigoBarra ?? row.codigo_barras ?? '').trim() || undefined;
      const imagenUrl = String(row.imagenUrl ?? row.imagen_url ?? '').trim() || undefined;
      const descripcion = String(row.descripcion ?? '').trim() || undefined;

      if (!nombre || !categoria || !marca || !sku || !Number.isFinite(precio) || precio < 0) {
        errores.push({
          fila,
          motivo:
            'Datos invalidos: nombre, precio, categoria, marca y sku son obligatorios y precio >= 0',
        });
        continue;
      }

      const skuKey = sku.toLowerCase();
      if (skuVistos.has(skuKey)) {
        errores.push({ fila, motivo: `SKU duplicado en archivo: ${sku}` });
        continue;
      }

      skuVistos.add(skuKey);
      filasValidas.push({
        fila,
        nombre,
        precio,
        categoria,
        marca,
        sku,
        codigoBarra,
        imagenUrl,
        descripcion,
      });
    }

    if (errores.length) {
      return { importados: 0, errores };
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        const categoriasRepo = manager.getRepository(Categoria);
        const marcasRepo = manager.getRepository(Marca);
        const productosRepo = manager.getRepository(Producto);
        const variantesRepo = manager.getRepository(Variante);

        const cacheCategorias = new Map<string, Categoria>();
        const cacheMarcas = new Map<string, Marca>();

        for (const fila of filasValidas) {
          const categoriaKey = fila.categoria.toLowerCase();
          const categoriaCache = cacheCategorias.get(categoriaKey);
          let categoria: Categoria | null = categoriaCache ?? null;
          if (!categoria) {
            categoria = await categoriasRepo.findOne({ where: { nombre: fila.categoria } });
            if (!categoria) {
              categoria = await categoriasRepo.save(
                categoriasRepo.create({
                  nombre: fila.categoria,
                  activo: true,
                  orden: 0,
                }),
              );
            }
            cacheCategorias.set(categoriaKey, categoria);
          }

          const marcaKey = fila.marca.toLowerCase();
          const marcaCache = cacheMarcas.get(marcaKey);
          let marca: Marca | null = marcaCache ?? null;
          if (!marca) {
            marca = await marcasRepo.findOne({ where: { nombre: fila.marca } });
            if (!marca) {
              marca = await marcasRepo.save(
                marcasRepo.create({
                  nombre: fila.marca,
                  activo: true,
                }),
              );
            }
            cacheMarcas.set(marcaKey, marca);
          }

          let producto = await productosRepo.findOne({
            where: {
              nombre: fila.nombre,
              categoriaId: categoria.id,
              marcaId: marca.id,
            },
          });

          if (!producto) {
            producto = await productosRepo.save(
              productosRepo.create({
                nombre: fila.nombre,
                descripcion: fila.descripcion,
                imagenUrl: fila.imagenUrl,
                precio: fila.precio,
                precioCompra: null,
                impuesto: 19,
                categoriaId: categoria.id,
                marcaId: marca.id,
                activo: true,
                stockMinimo: 0,
                permitirVentaSinStock: false,
              }),
            );
          } else {
            await productosRepo.update(producto.id, {
              precio: fila.precio,
              imagenUrl: fila.imagenUrl ?? producto.imagenUrl,
              descripcion: fila.descripcion ?? producto.descripcion,
              activo: true,
            });
          }

          const varianteExistente = await variantesRepo.findOne({ where: { sku: fila.sku } });
          if (varianteExistente) {
            await variantesRepo.update(varianteExistente.id, {
              productoId: producto.id,
              nombre: fila.nombre,
              precio: fila.precio,
              precioVenta: fila.precio,
              codigoBarras: fila.codigoBarra ?? varianteExistente.codigoBarras,
              activo: true,
            });
            continue;
          }

          await variantesRepo.save(
            variantesRepo.create({
              productoId: producto.id,
              nombre: fila.nombre,
              sku: fila.sku,
              codigoBarras: fila.codigoBarra,
              precio: fila.precio,
              precioVenta: fila.precio,
              activo: true,
            }),
          );
        }
      });
    } catch (error) {
      const motivo = error instanceof Error ? error.message : 'Error desconocido al importar CSV';
      return { importados: 0, errores: [{ fila: 0, motivo }] };
    }

    return { importados: filasValidas.length, errores: [] };
  }

  getTemplate(format: 'csv' | 'xlsx') {
    if (format === 'xlsx') {
      let xlsx: any;
      try {
        xlsx = require('xlsx');
      } catch {
        throw new BadRequestException(
          'Falta dependencia xlsx en backend. Instala paquete xlsx para generar plantilla XLSX.',
        );
      }

      const worksheet = xlsx.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'catalogo');
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return {
        filename: 'plantilla-importacion-catalogo.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        base64: Buffer.from(buffer).toString('base64'),
      };
    }

    const csv = `${TEMPLATE_HEADERS.join(';')}\n${TEMPLATE_EXAMPLE.join(';')}\n`;
    return {
      filename: 'plantilla-importacion-catalogo.csv',
      mimeType: 'text/csv; charset=utf-8',
      base64: Buffer.from(csv, 'utf-8').toString('base64'),
    };
  }

  private parseRowsFromFile(file: { originalname: string; buffer: Buffer }): ImportRowRaw[] {
    const filename = file.originalname.toLowerCase();
    if (filename.endsWith('.csv')) {
      return this.parseCsv(file.buffer);
    }
    if (filename.endsWith('.xlsx')) {
      return this.parseXlsx(file.buffer);
    }

    throw new BadRequestException('Formato no soportado. Usa .csv o .xlsx');
  }

  private parseCsv(buffer: Buffer): ImportRowRaw[] {
    const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return [];
    }

    const delimiter = this.detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map((header) => header.trim());

    return lines.slice(1).map((line, index) => {
      const values = line.split(delimiter).map((value) => value.trim());
      const row: ImportRowRaw = { rowNumber: index + 2 };

      headers.forEach((header, headerIndex) => {
        row[header] = values[headerIndex] ?? '';
      });

      return row;
    });
  }

  private parseXlsx(buffer: Buffer): ImportRowRaw[] {
    let workbook: any;
    try {
      const xlsx = require('xlsx');
      workbook = xlsx.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException(
        'Falta dependencia xlsx en backend. Instala paquete xlsx para habilitar este formato.',
      );
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return [];
    }

    const sheet = workbook.Sheets[sheetName];
    const xlsx = require('xlsx');
    const jsonRows: Record<string, unknown>[] = workbook?.Sheets
      ? xlsx.utils.sheet_to_json(sheet, {
          defval: '',
          raw: false,
        })
      : [];

    return jsonRows.map((row: Record<string, unknown>, index: number) => ({
      rowNumber: index + 2,
      ...row,
    }));
  }

  private detectDelimiter(headerLine: string): string {
    const semicolonCount = (headerLine.match(/;/g) ?? []).length;
    const commaCount = (headerLine.match(/,/g) ?? []).length;
    return semicolonCount >= commaCount ? ';' : ',';
  }

  private normalizeRow(row: ImportRowRaw, issues: ImportRowIssue[]): NormalizedImportRow | null {
    const getValue = (key: string): string => {
      const value = row[key];
      return value === null || value === undefined ? '' : String(value).trim();
    };

    const nombreProducto = getValue('nombreProducto');
    const categoria = getValue('categoria');
    const marca = getValue('marca');
    const nombreVariante = getValue('nombreVariante');

    const precioVentaProducto = this.parseNumber(getValue('precioVentaProducto'));
    const precioCostoProducto = this.parseNumber(getValue('precioCostoProducto'));
    const iva = this.parseNumber(getValue('iva'));
    const precioExtra = this.parseNumber(getValue('precioExtra') || '0');
    const precioVentaVariante = this.parseOptionalNumber(getValue('precioVentaVariante'));
    const precioCostoVariante = this.parseOptionalNumber(getValue('precioCostoVariante'));

    if (!nombreProducto) {
      issues.push({
        code: 'NOMBRE_PRODUCTO_REQUERIDO',
        message: 'nombreProducto es obligatorio',
      });
    }

    if (!categoria) {
      issues.push({
        code: 'CATEGORIA_REQUERIDA',
        message: 'categoria es obligatoria',
      });
    }

    if (!marca) {
      issues.push({
        code: 'MARCA_REQUERIDA',
        message: 'marca es obligatoria',
      });
    }

    if (!nombreVariante) {
      issues.push({
        code: 'NOMBRE_VARIANTE_REQUERIDO',
        message: 'nombreVariante es obligatorio',
      });
    }

    if (precioVentaProducto === null || precioVentaProducto < 0) {
      issues.push({
        code: 'PRECIO_VENTA_INVALIDO',
        message: 'precioVentaProducto debe ser un numero mayor o igual a 0',
      });
    }

    if (precioCostoProducto === null || precioCostoProducto < 0) {
      issues.push({
        code: 'PRECIO_COSTO_INVALIDO',
        message: 'precioCostoProducto debe ser un numero mayor o igual a 0',
      });
    }

    if (
      precioVentaProducto !== null &&
      precioCostoProducto !== null &&
      precioCostoProducto > precioVentaProducto
    ) {
      issues.push({
        code: 'PRECIO_PRODUCTO_INCONSISTENTE',
        message: 'precioCostoProducto no puede ser mayor a precioVentaProducto',
      });
    }

    if (iva === null || iva < 0 || iva > 100) {
      issues.push({
        code: 'IVA_INVALIDO',
        message: 'iva debe estar entre 0 y 100',
      });
    }

    if (precioExtra === null || precioExtra < 0) {
      issues.push({
        code: 'PRECIO_EXTRA_INVALIDO',
        message: 'precioExtra debe ser mayor o igual a 0',
      });
    }

    if (
      precioVentaVariante !== null &&
      precioCostoVariante !== null &&
      precioCostoVariante > precioVentaVariante
    ) {
      issues.push({
        code: 'PRECIO_VARIANTE_INCONSISTENTE',
        message: 'precioCostoVariante no puede ser mayor a precioVentaVariante',
      });
    }

    const codigoBarras = getValue('codigoBarras');
    if (codigoBarras && !/^\d{8,14}$/.test(codigoBarras)) {
      issues.push({
        code: 'CODIGO_BARRAS_INVALIDO',
        message: 'codigoBarras debe tener entre 8 y 14 digitos',
      });
    }

    if (issues.length) {
      return null;
    }

    return {
      rowNumber: row.rowNumber,
      codigoInterno: getValue('codigoInterno') || undefined,
      nombreProducto,
      descripcionProducto: getValue('descripcionProducto') || undefined,
      imagenProductoUrl: getValue('imagenProductoUrl') || undefined,
      categoria,
      marca,
      precioVentaProducto: Number(precioVentaProducto),
      precioCostoProducto: Number(precioCostoProducto),
      iva: Number(iva),
      nombreVariante,
      sku: getValue('sku') || undefined,
      codigoBarras: codigoBarras || undefined,
      precioExtra: Number(precioExtra),
      precioVentaVariante: precioVentaVariante ?? undefined,
      precioCostoVariante: precioCostoVariante ?? undefined,
      imagenVarianteUrl: getValue('imagenVarianteUrl') || undefined,
    };
  }

  private detectDuplicateRows(rows: NormalizedImportRow[]): ImportRowError[] {
    const errors: ImportRowError[] = [];
    const skuMap = new Map<string, number>();
    const barrasMap = new Map<string, number>();

    rows.forEach((row) => {
      if (row.sku) {
        const key = row.sku.toLowerCase();
        if (skuMap.has(key)) {
          errors.push({
            rowNumber: row.rowNumber,
            code: 'SKU_DUPLICADO_ARCHIVO',
            message: `SKU duplicado en archivo (fila ${skuMap.get(key)})`,
          });
        } else {
          skuMap.set(key, row.rowNumber);
        }
      }

      if (row.codigoBarras) {
        if (barrasMap.has(row.codigoBarras)) {
          errors.push({
            rowNumber: row.rowNumber,
            code: 'BARRAS_DUPLICADO_ARCHIVO',
            message: `codigoBarras duplicado en archivo (fila ${barrasMap.get(row.codigoBarras)})`,
          });
        } else {
          barrasMap.set(row.codigoBarras, row.rowNumber);
        }
      }
    });

    return errors;
  }

  private async buildSummary(
    validRows: NormalizedImportRow[],
    totalRows: number,
    errors: ImportRowError[],
    mode: ModoImportacion,
  ): Promise<ImportValidationSummary> {
    const productCreateCandidates = new Set<string>();
    const productUpdateCandidates = new Set<string>();
    let variantsToCreate = 0;
    let variantsToUpdate = 0;

    for (const row of validRows) {
      const producto = await this.resolveExistingProduct(row);
      const variante = await this.resolveExistingVariant(row);

      const productKey = `${row.codigoInterno ?? ''}|${this.normalizarTexto(row.nombreProducto)}|${this.normalizarTexto(row.categoria)}|${this.normalizarTexto(row.marca)}`;

      if (producto) {
        productUpdateCandidates.add(productKey);
      } else {
        productCreateCandidates.add(productKey);
      }

      if (variante) {
        variantsToUpdate += 1;
      } else {
        variantsToCreate += 1;
      }
    }

    if (mode === ModoImportacion.CREAR_SOLO) {
      variantsToUpdate = 0;
      productUpdateCandidates.clear();
    }

    if (mode === ModoImportacion.ACTUALIZAR_SOLO) {
      variantsToCreate = 0;
      productCreateCandidates.clear();
    }

    return {
      totalRows,
      validRows: validRows.length,
      rowsWithErrors: new Set(errors.map((item) => item.rowNumber)).size,
      productsToCreate: productCreateCandidates.size,
      productsToUpdate: productUpdateCandidates.size,
      variantsToCreate,
      variantsToUpdate,
    };
  }

  private async resolveExistingProduct(row: NormalizedImportRow): Promise<Producto | null> {
    if (row.codigoInterno) {
      return this.productosRepository.findOne({ where: { codigoInterno: row.codigoInterno } });
    }

    const categoria = await this.categoriasRepository.findOne({
      where: { nombre: row.categoria, activo: true },
    });
    const marca = await this.marcasRepository.findOne({
      where: { nombre: row.marca, activo: true },
    });
    if (!categoria || !marca) {
      return null;
    }

    return this.productosRepository.findOne({
      where: {
        nombre: row.nombreProducto,
        categoriaId: categoria.id,
        marcaId: marca.id,
        activo: true,
      },
    });
  }

  private async resolveExistingVariant(row: NormalizedImportRow): Promise<Variante | null> {
    if (row.sku) {
      const bySku = await this.variantesRepository.findOne({ where: { sku: row.sku } });
      if (bySku) {
        return bySku;
      }
    }

    if (row.codigoBarras) {
      return this.variantesRepository.findOne({ where: { codigoBarras: row.codigoBarras } });
    }

    return null;
  }

  private async resolveCategoriaIdByName(nombre: string): Promise<string> {
    const categoria = await this.categoriasRepository.findOne({
      where: { nombre, activo: true },
    });
    if (!categoria) {
      throw new UnprocessableEntityException(`Categoria '${nombre}' no existe o esta inactiva`);
    }
    return categoria.id;
  }

  private async resolveMarcaIdByName(nombre: string): Promise<string> {
    const marca = await this.marcasRepository.findOne({ where: { nombre, activo: true } });
    if (!marca) {
      throw new UnprocessableEntityException(`Marca '${nombre}' no existe o esta inactiva`);
    }
    return marca.id;
  }

  private async applyRow(
    row: NormalizedImportRow,
    mode: ModoImportacion,
  ): Promise<{
    action: EstadoImportacionCatalogoRow;
    productId: string;
    variantId: string;
    productAction: 'CREATED' | 'UPDATED' | 'SKIPPED';
    variantAction: 'CREATED' | 'UPDATED' | 'SKIPPED';
  }> {
    const categoriaId = await this.resolveCategoriaIdByName(row.categoria);
    const marcaId = await this.resolveMarcaIdByName(row.marca);

    let product = await this.resolveExistingProduct(row);
    let productAction: 'CREATED' | 'UPDATED' | 'SKIPPED' = 'SKIPPED';

    if (!product && mode !== ModoImportacion.ACTUALIZAR_SOLO) {
      const codigoInterno =
        row.codigoInterno ||
        `IMP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9999)
          .toString()
          .padStart(4, '0')}`;

      product = await this.productosRepository.save(
        this.productosRepository.create({
          nombre: row.nombreProducto,
          descripcion: row.descripcionProducto,
          imagenUrl: row.imagenProductoUrl,
          codigoInterno,
          categoriaId,
          marcaId,
          precioBase: row.precioVentaProducto,
          precioCosto: row.precioCostoProducto,
          iva: row.iva,
          activo: true,
        }),
      );
      productAction = 'CREATED';
    }

    if (product && mode !== ModoImportacion.CREAR_SOLO) {
      await this.productosRepository.update(product.id, {
        nombre: row.nombreProducto,
        descripcion: row.descripcionProducto,
        imagenUrl: row.imagenProductoUrl,
        categoriaId,
        marcaId,
        precioBase: row.precioVentaProducto,
        precioCosto: row.precioCostoProducto,
        iva: row.iva,
      });
      if (productAction === 'SKIPPED') {
        productAction = 'UPDATED';
      }
      product = (await this.productosRepository.findOne({ where: { id: product.id } })) ?? product;
    }

    if (!product) {
      throw new UnprocessableEntityException(
        'Producto no existe para modo actualizar_solo y no se puede crear',
      );
    }

    let variant = await this.resolveExistingVariant(row);
    let variantAction: 'CREATED' | 'UPDATED' | 'SKIPPED' = 'SKIPPED';

    if (!variant && mode !== ModoImportacion.ACTUALIZAR_SOLO) {
      variant = await this.variantesRepository.save(
        this.variantesRepository.create({
          productoId: product.id,
          nombre: row.nombreVariante,
          sku: row.sku ?? `IMPVAR${Date.now().toString().slice(-6)}`,
          codigoBarras: row.codigoBarras ?? `${770}${Math.floor(Math.random() * 1000000000)}`,
          precioExtra: row.precioExtra,
          precioVenta: row.precioVentaVariante,
          precioCosto: row.precioCostoVariante,
          imagenUrl: row.imagenVarianteUrl,
          activo: true,
        }),
      );
      variantAction = 'CREATED';
    }

    if (variant && mode !== ModoImportacion.CREAR_SOLO) {
      await this.variantesRepository.update(variant.id, {
        productoId: product.id,
        nombre: row.nombreVariante,
        sku: row.sku ?? variant.sku,
        codigoBarras: row.codigoBarras ?? variant.codigoBarras,
        precioExtra: row.precioExtra,
        precioVenta: row.precioVentaVariante,
        precioCosto: row.precioCostoVariante,
        imagenUrl: row.imagenVarianteUrl,
        activo: true,
      });
      if (variantAction === 'SKIPPED') {
        variantAction = 'UPDATED';
      }
      variant = (await this.variantesRepository.findOne({ where: { id: variant.id } })) ?? variant;
    }

    if (!variant) {
      throw new UnprocessableEntityException(
        'Variante no existe para modo actualizar_solo y no se puede crear',
      );
    }

    const action =
      productAction === 'CREATED' || variantAction === 'CREATED'
        ? EstadoImportacionCatalogoRow.CREATED
        : productAction === 'UPDATED' || variantAction === 'UPDATED'
          ? EstadoImportacionCatalogoRow.UPDATED
          : EstadoImportacionCatalogoRow.SKIPPED;

    return {
      action,
      productId: product.id,
      variantId: variant.id,
      productAction,
      variantAction,
    };
  }

  private parseNumber(value: string): number | null {
    if (!value) {
      return null;
    }

    const normalized = value.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseOptionalNumber(value: string): number | null {
    if (!value) {
      return null;
    }

    return this.parseNumber(value);
  }

  private normalizarTexto(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
