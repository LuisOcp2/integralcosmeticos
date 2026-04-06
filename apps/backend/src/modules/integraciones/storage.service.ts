import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListBucketsCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client | null;
  private readonly endpoint: string | null;
  private readonly bucket: string | null;
  private readonly baseDir: string;

  constructor(private readonly configService: ConfigService) {
    const s3Endpoint = this.configService.get<string>('S3_ENDPOINT') ?? null;
    const awsAccessKey = this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? null;
    const awsSecret = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? null;
    const region = this.configService.get<string>('AWS_REGION') ?? 'us-east-1';

    this.bucket = this.configService.get<string>('S3_BUCKET') ?? null;
    this.endpoint = s3Endpoint;
    this.baseDir = join(process.cwd(), 'apps/backend/uploads');

    if (s3Endpoint && awsAccessKey && awsSecret) {
      this.s3Client = new S3Client({
        region,
        endpoint: s3Endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: awsAccessKey,
          secretAccessKey: awsSecret,
        },
      });
      return;
    }

    if (awsAccessKey && awsSecret) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: awsAccessKey,
          secretAccessKey: awsSecret,
        },
      });
      return;
    }

    this.s3Client = null;
  }

  async upload(buffer: Buffer, mimeType: string, carpeta: string) {
    const extension = this.getExtensionByMimeType(mimeType);
    const fileName = `${randomUUID()}${extension}`;
    const normalizedFolder = carpeta.replace(/^\/+|\/+$/g, '') || 'general';

    if (this.s3Client && this.bucket) {
      const key = `${normalizedFolder}/${fileName}`;
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      if (this.endpoint) {
        return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
      }

      return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }

    const folderPath = join(this.baseDir, normalizedFolder);
    await mkdir(folderPath, { recursive: true });
    const filePath = join(folderPath, fileName);
    await writeFile(filePath, buffer);
    return `/uploads/${normalizedFolder}/${fileName}`;
  }

  async delete(url: string) {
    if (!url) {
      return { ok: true };
    }

    if (this.s3Client && this.bucket) {
      const key = this.extractKeyFromUrl(url);
      if (!key) {
        throw new NotFoundException('No se pudo resolver el archivo a eliminar');
      }
      await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      return { ok: true };
    }

    const relative = url.replace(/^\/uploads\//, '');
    const filePath = join(this.baseDir, relative);
    await rm(filePath, { force: true });
    return { ok: true };
  }

  async testS3Connection() {
    if (!this.s3Client) {
      return { ok: false, message: 'No hay configuracion S3 activa' };
    }

    const response = await this.s3Client.send(new ListBucketsCommand({}));
    return {
      ok: true,
      buckets: (response.Buckets ?? [])
        .map((bucket: { Name?: string }) => bucket.Name)
        .filter(Boolean),
    };
  }

  private getExtensionByMimeType(mimeType: string) {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'application/zip': '.zip',
    };

    return (map[mimeType] ?? extname(mimeType).trim()) || '';
  }

  private extractKeyFromUrl(url: string) {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.replace(/^\//, '');

      if (this.endpoint && url.startsWith(this.endpoint)) {
        const withBucketPrefix = `${this.bucket}/`;
        return pathname.startsWith(withBucketPrefix)
          ? pathname.slice(withBucketPrefix.length)
          : pathname;
      }

      if (parsed.hostname.includes('.s3.')) {
        return pathname;
      }

      return pathname;
    } catch {
      return null;
    }
  }
}
