import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb } from 'pdf-lib';
import { OrdenCompra } from '../entities/orden-compra.entity';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';

@Injectable()
export class PdfGeneratorUtil {
  async generarPdfOrdenCompra(ordenCompra: OrdenCompra): Promise<Buffer> {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    // Define colors
    const darkBlue = rgb(0.1, 0.2, 0.4);
    const gray = rgb(0.5, 0.5, 0.5);
    const lightGray = rgb(0.9, 0.9, 0.9);

    // Add title
    page.drawText('ORDEN DE COMPRA', {
      x: width / 2 - 100,
      y: height - 100,
      size: 24,
      color: darkBlue,
    });

    // Add order number
    page.drawText(`Número: ${ordenCompra.numeroOrden}`, {
      x: 50,
      y: height - 150,
      size: 14,
      color: darkBlue,
    });

    // Add date
    page.drawText(`Fecha: ${ordenCompra.creadoEn.toLocaleDateString()}`, {
      x: 50,
      y: height - 180,
      size: 12,
      color: gray,
    });

    // Add supplier info
    page.drawText('Información del Proveedor:', {
      x: 50,
      y: height - 230,
      size: 14,
      color: darkBlue,
    });

    page.drawText(`Nombre: ${ordenCompra.proveedor.razonSocial}`, {
      x: 70,
      y: height - 260,
      size: 12,
      color: gray,
    });

    if (ordenCompra.proveedor.numeroDocumentoLegal) {
      page.drawText(`Documento Legal: ${ordenCompra.proveedor.numeroDocumentoLegal}`, {
        x: 70,
        y: height - 280,
        size: 12,
        color: gray,
      });
    }

    if (ordenCompra.proveedor.telefono) {
      page.drawText(`Teléfono: ${ordenCompra.proveedor.telefono}`, {
        x: 70,
        y: height - 300,
        size: 12,
        color: gray,
      });
    }

    if (ordenCompra.proveedor.email) {
      page.drawText(`Email: ${ordenCompra.proveedor.email}`, {
        x: 70,
        y: height - 320,
        size: 12,
        color: gray,
      });
    }

    if (ordenCompra.proveedor.direccion) {
      page.drawText(`Dirección: ${ordenCompra.proveedor.direccion}`, {
        x: 70,
        y: height - 340,
        size: 12,
        color: gray,
      });
    }

    // Add order details
    page.drawText('Detalles de la Orden:', {
      x: 50,
      y: height - 390,
      size: 14,
      color: darkBlue,
    });

    page.drawText(`Total: $${ordenCompra.total.toFixed(2)}`, {
      x: 70,
      y: height - 420,
      size: 12,
      color: gray,
    });

    page.drawText(`Estado: ${ordenCompra.estado}`, {
      x: 70,
      y: height - 440,
      size: 12,
      color: gray,
    });

    if (ordenCompra.fechaEntregaEsperada) {
      page.drawText(
        `Fecha de Entrega Esperada: ${ordenCompra.fechaEntregaEsperada.toLocaleDateString()}`,
        {
          x: 70,
          y: height - 460,
          size: 12,
          color: gray,
        },
      );
    }

    // Add footer
    page.drawText('Generado por Integral Cosméticos Sistema', {
      x: width / 2 - 150,
      y: 50,
      size: 10,
      color: lightGray,
    });

    // Serialize the PDFDocument to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
