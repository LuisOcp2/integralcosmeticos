export interface ImportRowRaw {
  rowNumber: number;
  [key: string]: unknown;
}

export interface NormalizedImportRow {
  rowNumber: number;
  codigoInterno?: string;
  nombreProducto: string;
  descripcionProducto?: string;
  imagenProductoUrl?: string;
  categoria: string;
  marca: string;
  precioVentaProducto: number;
  precioCostoProducto: number;
  iva: number;
  nombreVariante: string;
  sku?: string;
  codigoBarras?: string;
  precioExtra: number;
  precioVentaVariante?: number;
  precioCostoVariante?: number;
  imagenVarianteUrl?: string;
}

export interface ImportRowError {
  rowNumber: number;
  code: string;
  message: string;
}

export interface ImportRowIssue {
  code: string;
  message: string;
}

export interface ImportValidationSummary {
  totalRows: number;
  validRows: number;
  rowsWithErrors: number;
  productsToCreate: number;
  productsToUpdate: number;
  variantsToCreate: number;
  variantsToUpdate: number;
}

export interface ImportValidationResult {
  dryRun: boolean;
  mode: string;
  summary: ImportValidationSummary;
  errors: ImportRowError[];
  normalizedRowsPreview: NormalizedImportRow[];
}

export interface ImportValidationJobResult extends ImportValidationResult {
  jobId: string;
  status: string;
}
