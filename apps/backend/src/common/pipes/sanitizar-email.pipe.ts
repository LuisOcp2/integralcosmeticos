import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Pipe que sanitiza el campo `email` de cualquier body:
 * lo convierte a minúsculas y elimina espacios al inicio/final.
 * Seguro contra inputs null/undefined.
 */
@Injectable()
export class SanitizarEmailPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (value && typeof value === 'object' && 'email' in value) {
      const obj = value as Record<string, unknown>;
      if (typeof obj['email'] === 'string') {
        obj['email'] = obj['email'].toLowerCase().trim();
      }
    }
    return value;
  }
}
