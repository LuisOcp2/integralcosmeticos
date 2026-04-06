import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFImage, PDFPage, rgb } from 'pdf-lib';
import { OrdenCompra } from '../entities/orden-compra.entity';

type Palette = {
  dark: ReturnType<typeof rgb>;
  muted: ReturnType<typeof rgb>;
  light: ReturnType<typeof rgb>;
  accent: ReturnType<typeof rgb>;
  headerText: ReturnType<typeof rgb>;
};

@Injectable()
export class PdfGeneratorUtil {
  private readonly pageWidth = 595.28;
  private readonly pageHeight = 841.89;
  private readonly marginX = 40;
  private readonly topY = 800;

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private toDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  }

  private sanitize(value: unknown, fallback = '-'): string {
    if (typeof value !== 'string') return fallback;
    const clean = value.trim();
    return clean.length ? clean : fallback;
  }

  private money(value: unknown): string {
    return this.toNumber(value).toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private fmtDate(value: unknown): string {
    const date = this.toDate(value);
    return date ? date.toLocaleDateString('es-CO') : '-';
  }

  private async imageFromBase64(pdfDoc: PDFDocument, input?: string): Promise<PDFImage | null> {
    if (!input) return null;
    const payload = input.includes(',') ? (input.split(',').at(-1) ?? '') : input;
    if (!payload.trim()) return null;

    try {
      const bytes = Buffer.from(payload, 'base64');
      const lower = input.toLowerCase();
      if (lower.includes('image/png')) return await pdfDoc.embedPng(bytes);
      if (lower.includes('image/jpeg') || lower.includes('image/jpg'))
        return await pdfDoc.embedJpg(bytes);

      try {
        return await pdfDoc.embedPng(bytes);
      } catch {
        return await pdfDoc.embedJpg(bytes);
      }
    } catch {
      return null;
    }
  }

  private drawKV(
    page: PDFPage,
    label: string,
    value: string,
    x: number,
    y: number,
    palette: Palette,
    size = 9,
  ) {
    page.drawText(`${label}:`, { x, y, size, color: palette.muted });
    page.drawText(value, { x: x + 70, y, size, color: palette.dark });
  }

  private drawWrappedText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    maxChars: number,
    lineHeight: number,
    color: ReturnType<typeof rgb>,
    size = 8,
  ): number {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);

    let cursorY = y;
    for (const line of lines) {
      page.drawText(line, { x, y: cursorY, size, color });
      cursorY -= lineHeight;
    }
    return cursorY;
  }

  private drawSignatureCard(
    page: PDFPage,
    options: {
      x: number;
      y: number;
      width: number;
      title: string;
      name: string;
      role: string;
      image?: PDFImage | null;
      palette: Palette;
    },
  ) {
    const { x, y, width, title, name, role, image, palette } = options;

    page.drawRectangle({
      x,
      y,
      width,
      height: 92,
      borderColor: palette.light,
      borderWidth: 1,
    });

    page.drawText(title, { x: x + 8, y: y + 76, size: 9, color: palette.dark });

    if (image) {
      const maxW = width - 24;
      const maxH = 32;
      const scale = Math.min(maxW / image.width, maxH / image.height, 1);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      page.drawImage(image, {
        x: x + (width - drawW) / 2,
        y: y + 34,
        width: drawW,
        height: drawH,
      });
    }

    page.drawLine({
      start: { x: x + 8, y: y + 30 },
      end: { x: x + width - 8, y: y + 30 },
      thickness: 1,
      color: palette.light,
    });

    page.drawText(name, { x: x + 8, y: y + 16, size: 8, color: palette.dark });
    page.drawText(role, { x: x + 8, y: y + 6, size: 8, color: palette.muted });
  }

  async generarPdfOrdenCompra(ordenCompra: OrdenCompra): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);

    const palette: Palette = {
      dark: rgb(0.13, 0.18, 0.26),
      muted: rgb(0.35, 0.39, 0.47),
      light: rgb(0.85, 0.88, 0.92),
      accent: rgb(0.1, 0.29, 0.58),
      headerText: rgb(1, 1, 1),
    };

    const left = this.marginX;
    const right = this.pageWidth - this.marginX;

    const subtotal = this.toNumber(ordenCompra.subtotal);
    const impuestos = this.toNumber(ordenCompra.impuestos);
    const total = this.toNumber(ordenCompra.total);

    const items = (ordenCompra.detallesOrden ?? []).map((detalle, index) => {
      const variante = detalle.variante;
      const producto = variante?.producto;
      const cantidad = this.toNumber(detalle.cantidadPedida);
      const unitario = this.toNumber(detalle.precioUnitario);
      const totalLinea = cantidad * unitario;
      return {
        nro: index + 1,
        producto: this.sanitize(producto?.nombre ?? variante?.nombre ?? 'Producto'),
        descripcion: [
          `Variante ${this.sanitize(variante?.nombre ?? null, 'N/A')}`,
          `SKU ${this.sanitize(variante?.sku ?? null, 'N/A')}`,
          `Cod ${this.sanitize(variante?.codigoBarras ?? null, 'N/A')}`,
          this.sanitize(producto?.descripcion ?? null, 'Sin descripcion'),
        ].join(' | '),
        cantidad,
        unitario,
        totalLinea,
      };
    });

    const logoImage = await this.imageFromBase64(pdfDoc, process.env.EMPRESA_LOGO_BASE64);
    const firmaComprador = await this.imageFromBase64(
      pdfDoc,
      process.env.OC_FIRMA_COMPRADOR_BASE64,
    );
    const firmaProveedor = await this.imageFromBase64(
      pdfDoc,
      process.env.OC_FIRMA_PROVEEDOR_BASE64,
    );

    page.drawRectangle({
      x: left,
      y: this.topY - 44,
      width: right - left,
      height: 56,
      color: palette.accent,
    });

    if (logoImage) {
      const logoMaxW = 84;
      const logoMaxH = 36;
      const scale = Math.min(logoMaxW / logoImage.width, logoMaxH / logoImage.height, 1);
      const drawW = logoImage.width * scale;
      const drawH = logoImage.height * scale;
      page.drawImage(logoImage, {
        x: left + 10,
        y: this.topY - 34,
        width: drawW,
        height: drawH,
      });
    }

    page.drawText('ORDEN DE COMPRA', {
      x: left + 108,
      y: this.topY - 14,
      size: 18,
      color: palette.headerText,
    });
    page.drawText(`Nro: ${this.sanitize(ordenCompra.numero)}`, {
      x: right - 150,
      y: this.topY - 10,
      size: 10,
      color: palette.headerText,
    });
    page.drawText(`Fecha: ${this.fmtDate(ordenCompra.createdAt)}`, {
      x: right - 150,
      y: this.topY - 24,
      size: 9,
      color: rgb(0.9, 0.93, 1),
    });

    const infoTop = this.topY - 66;
    const blockGap = 16;
    const blockWidth = (right - left - blockGap) / 2;
    const leftBlockX = left;
    const rightBlockX = left + blockWidth + blockGap;

    page.drawRectangle({
      x: leftBlockX,
      y: infoTop - 102,
      width: blockWidth,
      height: 102,
      borderColor: palette.light,
      borderWidth: 1,
    });
    page.drawRectangle({
      x: rightBlockX,
      y: infoTop - 102,
      width: blockWidth,
      height: 102,
      borderColor: palette.light,
      borderWidth: 1,
    });

    page.drawText('COMPRADOR', {
      x: leftBlockX + 10,
      y: infoTop - 16,
      size: 10,
      color: palette.dark,
    });
    this.drawKV(page, 'Empresa', 'Integral Cosmeticos', leftBlockX + 10, infoTop - 32, palette);
    this.drawKV(page, 'NIT', '900000000-0', leftBlockX + 10, infoTop - 46, palette);
    this.drawKV(
      page,
      'Sede',
      this.sanitize(ordenCompra.sede?.nombre ?? null),
      leftBlockX + 10,
      infoTop - 60,
      palette,
    );
    this.drawKV(
      page,
      'Direccion',
      this.sanitize(ordenCompra.sede?.direccion ?? null),
      leftBlockX + 10,
      infoTop - 74,
      palette,
    );
    this.drawKV(
      page,
      'Ciudad',
      this.sanitize(ordenCompra.sede?.ciudad ?? null),
      leftBlockX + 10,
      infoTop - 88,
      palette,
    );

    page.drawText('PROVEEDOR', {
      x: rightBlockX + 10,
      y: infoTop - 16,
      size: 10,
      color: palette.dark,
    });
    this.drawKV(
      page,
      'Razon social',
      this.sanitize(ordenCompra.proveedor?.nombre ?? null),
      rightBlockX + 10,
      infoTop - 32,
      palette,
    );
    this.drawKV(
      page,
      'NIT',
      this.sanitize(ordenCompra.proveedor?.nit ?? null),
      rightBlockX + 10,
      infoTop - 46,
      palette,
    );
    this.drawKV(
      page,
      'Contacto',
      this.sanitize(ordenCompra.proveedor?.contactoNombre ?? null, 'Sin contacto'),
      rightBlockX + 10,
      infoTop - 60,
      palette,
    );
    this.drawKV(
      page,
      'Email',
      this.sanitize(ordenCompra.proveedor?.email ?? null, 'Sin email'),
      rightBlockX + 10,
      infoTop - 74,
      palette,
    );
    this.drawKV(
      page,
      'Telefono',
      this.sanitize(ordenCompra.proveedor?.telefono ?? null, 'Sin telefono'),
      rightBlockX + 10,
      infoTop - 88,
      palette,
    );

    const metaY = infoTop - 122;
    page.drawText('DATOS DE LA ORDEN', { x: left, y: metaY, size: 10, color: palette.dark });
    this.drawKV(
      page,
      'Creada por',
      `${this.sanitize(ordenCompra.creadoPor?.nombre ?? null)} ${this.sanitize(ordenCompra.creadoPor?.apellido ?? null, '')}`.trim(),
      left,
      metaY - 16,
      palette,
    );
    this.drawKV(page, 'Estado', this.sanitize(ordenCompra.estado), left + 280, metaY - 16, palette);
    this.drawKV(
      page,
      'Entrega esperada',
      this.fmtDate(ordenCompra.fechaEsperada),
      left,
      metaY - 30,
      palette,
    );
    this.drawKV(
      page,
      'Fecha recepcion',
      this.fmtDate(ordenCompra.fechaRecepcion),
      left + 280,
      metaY - 30,
      palette,
    );

    const tableTop = metaY - 54;
    const tableBottom = 272;
    const colNro = left + 8;
    const colDesc = left + 34;
    const colCant = right - 176;
    const colUnit = right - 120;
    const colTot = right - 56;

    page.drawRectangle({
      x: left,
      y: tableTop - 16,
      width: right - left,
      height: 20,
      color: rgb(0.95, 0.97, 1),
    });
    page.drawText('#', { x: colNro, y: tableTop - 10, size: 9, color: palette.dark });
    page.drawText('Producto / descripcion', {
      x: colDesc,
      y: tableTop - 10,
      size: 9,
      color: palette.dark,
    });
    page.drawText('Cant.', { x: colCant, y: tableTop - 10, size: 9, color: palette.dark });
    page.drawText('Unitario', { x: colUnit, y: tableTop - 10, size: 9, color: palette.dark });
    page.drawText('Total', { x: colTot, y: tableTop - 10, size: 9, color: palette.dark });

    let rowY = tableTop - 26;
    for (const item of items.slice(0, 8)) {
      if (rowY < tableBottom + 24) break;

      page.drawText(String(item.nro), { x: colNro, y: rowY, size: 8, color: palette.muted });
      page.drawText(item.producto.slice(0, 44), {
        x: colDesc,
        y: rowY,
        size: 9,
        color: palette.dark,
      });
      const yAfterDesc = this.drawWrappedText(
        page,
        item.descripcion,
        colDesc,
        rowY - 10,
        74,
        10,
        palette.muted,
        8,
      );

      page.drawText(String(item.cantidad), {
        x: colCant + 8,
        y: rowY,
        size: 9,
        color: palette.dark,
      });
      page.drawText(this.money(item.unitario), {
        x: colUnit - 8,
        y: rowY,
        size: 9,
        color: palette.dark,
      });
      page.drawText(this.money(item.totalLinea), {
        x: colTot - 6,
        y: rowY,
        size: 9,
        color: palette.dark,
      });

      const nextRowY = yAfterDesc - 8;
      page.drawLine({
        start: { x: left, y: nextRowY + 4 },
        end: { x: right, y: nextRowY + 4 },
        thickness: 0.6,
        color: rgb(0.93, 0.94, 0.96),
      });
      rowY = nextRowY - 2;
    }

    page.drawRectangle({
      x: right - 202,
      y: tableBottom + 8,
      width: 202,
      height: 64,
      color: rgb(0.97, 0.98, 1),
      borderColor: palette.light,
      borderWidth: 1,
    });
    this.drawKV(
      page,
      'Subtotal',
      `$ ${this.money(subtotal)}`,
      right - 194,
      tableBottom + 56,
      palette,
    );
    this.drawKV(
      page,
      'Impuestos',
      `$ ${this.money(impuestos)}`,
      right - 194,
      tableBottom + 42,
      palette,
    );
    page.drawText('Total OC:', {
      x: right - 194,
      y: tableBottom + 26,
      size: 9,
      color: palette.accent,
    });
    page.drawText(`$ ${this.money(total)}`, {
      x: right - 124,
      y: tableBottom + 26,
      size: 10,
      color: palette.accent,
    });

    const legalTop = 250;
    page.drawRectangle({
      x: left,
      y: legalTop - 112,
      width: right - left,
      height: 112,
      borderColor: palette.light,
      borderWidth: 1,
    });
    page.drawText('CONDICIONES COMERCIALES Y LEGALES', {
      x: left + 10,
      y: legalTop - 14,
      size: 10,
      color: palette.dark,
    });

    const terms = [
      '1. Esta orden autoriza el suministro bajo cantidades, valores y referencias descritas.',
      '2. La factura del proveedor debe referenciar obligatoriamente el numero de esta OC.',
      '3. El proveedor garantiza calidad, originalidad y cumplimiento sanitario de los productos.',
      '4. Diferencias de cantidad o calidad deben reportarse dentro de 24 horas de recibido.',
      '5. Entregas parciales requieren aprobacion previa y escrita del comprador.',
      '6. Forma de pago segun acuerdo comercial vigente entre comprador y proveedor.',
    ];

    let termsY = legalTop - 30;
    for (const term of terms) {
      page.drawText(term, { x: left + 10, y: termsY, size: 8, color: palette.muted });
      termsY -= 14;
    }

    const signTop = 120;
    page.drawText('CAMPOS DE APROBACION', { x: left, y: signTop, size: 10, color: palette.dark });

    const cardY = 18;
    this.drawSignatureCard(page, {
      x: left,
      y: cardY,
      width: 164,
      title: 'Elaborado por (Comprador)',
      name: `${this.sanitize(ordenCompra.creadoPor?.nombre ?? null)} ${this.sanitize(ordenCompra.creadoPor?.apellido ?? null, '')}`.trim(),
      role: this.sanitize(ordenCompra.creadoPor?.rol ?? null, 'Responsable de compras'),
      image: firmaComprador,
      palette,
    });

    this.drawSignatureCard(page, {
      x: left + 176,
      y: cardY,
      width: 164,
      title: 'Aprobado por',
      name: '________________________',
      role: 'Direccion Administrativa',
      image: null,
      palette,
    });

    this.drawSignatureCard(page, {
      x: left + 352,
      y: cardY,
      width: 164,
      title: 'Aceptacion proveedor',
      name: this.sanitize(
        ordenCompra.proveedor?.contactoNombre ?? null,
        '________________________',
      ),
      role: this.sanitize(ordenCompra.proveedor?.nombre ?? null, 'Proveedor'),
      image: firmaProveedor,
      palette,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
