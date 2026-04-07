import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Rol } from '@cosmeticos/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DocumentosService } from './documentos.service';
import { CreateCarpetaDto } from './dto/create-carpeta.dto';
import { UpdateCarpetaDto } from './dto/update-carpeta.dto';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { BuscarDocumentosDto } from './dto/buscar-documentos.dto';
import { CrearVersionDocumentoDto } from './dto/crear-version-documento.dto';

type CreateDocumentoUploadDto = Omit<
  CreateDocumentoDto,
  'archivoUrl' | 'nombreArchivo' | 'mimeType' | 'tamano'
>;

@ApiTags('documentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERVISOR)
@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get('carpetas')
  @ApiOperation({ summary: 'Obtener arbol de carpetas' })
  getArbolCarpetas() {
    return this.documentosService.getCarpetaArbol();
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Buscar documentos por texto/tipo/carpeta' })
  buscar(@Query() query: BuscarDocumentosDto) {
    return this.documentosService.buscar(query);
  }

  @Get('por-entidad')
  @ApiOperation({ summary: 'Documentos relacionados con entidad' })
  getPorEntidad(@Query('tipo') tipo: string, @Query('entidadId') entidadId: string) {
    return this.documentosService.getDocumentosEntidad(tipo, entidadId);
  }

  @Get('vencidos-proximos')
  @ApiOperation({ summary: 'Documentos vencidos/proximos a vencer' })
  getVencidosProximos(@Query('dias', new DefaultValuePipe(30), ParseIntPipe) dias: number) {
    return this.documentosService.getDocumentosVencidosProximos(dias);
  }

  @Post('carpetas')
  @ApiOperation({ summary: 'Crear carpeta' })
  createCarpeta(@Body() dto: CreateCarpetaDto, @Request() req: any) {
    return this.documentosService.createCarpeta(dto, req.user.id);
  }

  @Get('carpetas/:id')
  @ApiOperation({ summary: 'Obtener carpeta por id' })
  findCarpeta(@Param('id') id: string) {
    return this.documentosService.findCarpeta(id);
  }

  @Put('carpetas/:id')
  @ApiOperation({ summary: 'Actualizar carpeta' })
  updateCarpeta(@Param('id') id: string, @Body() dto: UpdateCarpetaDto) {
    return this.documentosService.updateCarpeta(id, dto);
  }

  @Delete('carpetas/:id')
  @ApiOperation({ summary: 'Eliminar carpeta' })
  removeCarpeta(@Param('id') id: string) {
    return this.documentosService.removeCarpeta(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear documento' })
  createDocumento(@Body() dto: CreateDocumentoDto, @Request() req: any) {
    return this.documentosService.createDocumento(dto, req.user.id);
  }

  @Post('subir-archivo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Subir archivo y crear documento' })
  createDocumentoDesdeArchivo(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentoUploadDto,
    @Request() req: any,
  ) {
    return this.documentosService.createDocumentoDesdeArchivo(dto, req.user.id, file);
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos (opcional por carpeta)' })
  findDocumentos(@Query('carpetaId') carpetaId?: string) {
    return this.documentosService.findDocumentos(carpetaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener documento por id' })
  findDocumento(@Param('id') id: string) {
    return this.documentosService.findDocumento(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar documento' })
  updateDocumento(@Param('id') id: string, @Body() dto: UpdateDocumentoDto) {
    return this.documentosService.updateDocumento(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar documento' })
  removeDocumento(@Param('id') id: string) {
    return this.documentosService.removeDocumento(id);
  }

  @Get(':id/versiones')
  @ApiOperation({ summary: 'Listar versiones del documento' })
  getVersiones(@Param('id') id: string) {
    return this.documentosService.getVersiones(id);
  }

  @Post(':id/nueva-version')
  @ApiOperation({ summary: 'Crear nueva version del documento' })
  crearVersion(
    @Param('id') id: string,
    @Body() dto: CrearVersionDocumentoDto,
    @Request() req: any,
  ) {
    return this.documentosService.crearVersion(id, dto, req.user.id);
  }

  @Post(':id/nueva-version-archivo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Subir archivo como nueva version' })
  crearVersionArchivo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: Pick<CrearVersionDocumentoDto, 'cambios'>,
    @Request() req: any,
  ) {
    return this.documentosService.crearVersionDesdeArchivo(id, dto, req.user.id, file);
  }
}
