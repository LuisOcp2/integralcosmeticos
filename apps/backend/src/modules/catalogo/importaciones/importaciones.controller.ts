import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Rol } from '@cosmeticos/shared-types';
import { memoryStorage } from 'multer';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SubirImportacionQueryDto } from './dto/subir-importacion-query.dto';
import { ModoImportacion, ValidarImportacionDto } from './dto/validar-importacion.dto';
import { ImportacionesService } from './importaciones.service';

@ApiTags('catalogo-importaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('catalogo/importaciones')
export class ImportacionesController {
  constructor(private readonly importacionesService: ImportacionesService) {}

  @Post('archivo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Subir y validar archivo de catalogo (CSV/XLSX) en modo dry-run',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean })
  @ApiQuery({
    name: 'modo',
    required: false,
    enum: ModoImportacion,
    description: 'Modo de importacion',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const name = file.originalname.toLowerCase();
        if (name.endsWith('.csv') || name.endsWith('.xlsx')) {
          callback(null, true);
          return;
        }
        callback(new BadRequestException('Solo se admiten archivos .csv o .xlsx'), false);
      },
    }),
  )
  subirYValidar(
    @UploadedFile() file: { originalname: string; buffer: Buffer },
    @Query() query: SubirImportacionQueryDto & ValidarImportacionDto,
    @Req() req: { user?: { id?: string } },
  ) {
    return this.importacionesService.createImportJobFromFile(file, {
      dryRun: query.dryRun ?? true,
      modo: query.modo,
      createdBy: req.user?.id,
    });
  }

  @Post(':jobId/ejecutar')
  @ApiOperation({ summary: 'Ejecutar importacion validada en cola Bull' })
  ejecutar(@Param('jobId') jobId: string) {
    return this.importacionesService.executeImport(jobId);
  }

  @Get(':jobId/estado')
  @ApiOperation({ summary: 'Obtener estado y progreso de un job de importacion' })
  estado(@Param('jobId') jobId: string) {
    return this.importacionesService.getImportJobStatus(jobId);
  }

  @Get(':jobId/reporte')
  @ApiOperation({ summary: 'Obtener reporte por fila de un job de importacion' })
  reporte(@Param('jobId') jobId: string) {
    return this.importacionesService.getImportJobReport(jobId);
  }

  @Get(':jobId/errores.csv')
  @ApiOperation({ summary: 'Descargar CSV con filas de error del job' })
  erroresCsv(@Param('jobId') jobId: string) {
    return this.importacionesService.getImportJobErrorsCsv(jobId);
  }

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOperation({ summary: 'Listar jobs recientes de importacion' })
  listar(@Query('limit') limit?: string) {
    return this.importacionesService.listImportJobs(limit ? Number(limit) : 20);
  }

  @Get('plantilla')
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'] })
  @ApiOperation({ summary: 'Descargar plantilla base de importacion (CSV o XLSX)' })
  plantilla(@Query('format') format?: 'csv' | 'xlsx') {
    return this.importacionesService.getTemplate(format ?? 'csv');
  }

  @Get('health')
  @ApiOperation({
    summary: 'Diagnostico de importaciones: tablas y cola Bull/Redis',
  })
  health() {
    return this.importacionesService.getHealth();
  }
}
