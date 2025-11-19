/**
 * File Upload Service
 *
 * Handles file uploads for expense receipts and attachments
 * Supports local storage and can be extended for S3/cloud storage
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import type { RequestHandler } from 'express';

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
const THUMBNAIL_SIZE = 200;

// Allowed file types for expense receipts
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// Image types that can have thumbnails generated
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export interface UploadedFile {
  originalName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  thumbnailPath?: string;
}

export interface UploadOptions {
  tenantId: string;
  subDirectory?: string; // e.g., 'expenses', 'receipts'
  generateThumbnail?: boolean;
}

export class FileUploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(UPLOAD_DIR);
    this.ensureDirectoryExists(this.uploadDir);
  }

  /**
   * Get multer middleware configured for expense uploads
   */
  getMulterMiddleware(options: { fieldName?: string; maxCount?: number } = {}): RequestHandler {
    const { fieldName = 'file', maxCount = 1 } = options;

    const storage = multer.memoryStorage(); // Use memory storage for processing

    const fileFilter = (
      _req: Express.Request,
      file: Express.Multer.File,
      cb: multer.FileFilterCallback
    ) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} is not allowed`));
      }
    };

    const upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: maxCount,
      },
    });

    if (maxCount === 1) {
      return upload.single(fieldName);
    }
    return upload.array(fieldName, maxCount);
  }

  /**
   * Process and save an uploaded file
   */
  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<UploadedFile> {
    const { tenantId, subDirectory = 'files', generateThumbnail = true } = options;

    // Create tenant-specific directory
    const tenantDir = path.join(this.uploadDir, tenantId, subDirectory);
    this.ensureDirectoryExists(tenantDir);

    // Generate unique filename
    const ext = path.extname(originalName);
    const uniqueId = crypto.randomUUID();
    const fileName = `${uniqueId}${ext}`;
    const filePath = path.join(tenantDir, fileName);

    // Save the file
    await fs.promises.writeFile(filePath, buffer);

    const result: UploadedFile = {
      originalName,
      fileName,
      fileType: mimeType,
      fileSize: buffer.length,
      filePath: path.relative(this.uploadDir, filePath),
    };

    // Generate thumbnail for images
    if (generateThumbnail && IMAGE_MIME_TYPES.includes(mimeType)) {
      try {
        const thumbnailPath = await this.generateThumbnail(buffer, tenantDir, uniqueId);
        result.thumbnailPath = path.relative(this.uploadDir, thumbnailPath);
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
        // Don't fail the upload if thumbnail generation fails
      }
    }

    return result;
  }

  /**
   * Generate a thumbnail for an image
   */
  private async generateThumbnail(
    buffer: Buffer,
    directory: string,
    uniqueId: string
  ): Promise<string> {
    const thumbnailDir = path.join(directory, 'thumbnails');
    this.ensureDirectoryExists(thumbnailDir);

    const thumbnailPath = path.join(thumbnailDir, `${uniqueId}_thumb.jpg`);

    await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return thumbnailPath;
  }

  /**
   * Delete a file and its thumbnail
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath);

    try {
      await fs.promises.unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // Try to delete thumbnail if it exists
    const thumbnailPath = this.getThumbnailPath(filePath);
    if (thumbnailPath) {
      try {
        await fs.promises.unlink(path.join(this.uploadDir, thumbnailPath));
      } catch {
        // Ignore thumbnail deletion errors
      }
    }
  }

  /**
   * Get the file stream for downloading
   */
  getFileStream(filePath: string): fs.ReadStream {
    const fullPath = path.join(this.uploadDir, filePath);
    return fs.createReadStream(fullPath);
  }

  /**
   * Get file buffer (for processing)
   */
  async getFileBuffer(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, filePath);
    return fs.promises.readFile(fullPath);
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.uploadDir, filePath);
    try {
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the thumbnail path for a given file path
   */
  private getThumbnailPath(filePath: string): string | null {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);

    return path.join(dir, 'thumbnails', `${baseName}_thumb.jpg`);
  }

  /**
   * Get the full path for serving a file
   */
  getFullPath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath: string): Promise<fs.Stats | null> {
    const fullPath = path.join(this.uploadDir, filePath);
    try {
      return await fs.promises.stat(fullPath);
    } catch {
      return null;
    }
  }

  /**
   * Ensure directory exists, create if not
   */
  private ensureDirectoryExists(directory: string): void {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  /**
   * Clean up old files (utility for maintenance)
   */
  async cleanupOldFiles(tenantId: string, maxAgeDays: number = 90): Promise<number> {
    const tenantDir = path.join(this.uploadDir, tenantId);
    if (!fs.existsSync(tenantDir)) {
      return 0;
    }

    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    const processDirectory = async (dir: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await processDirectory(fullPath);
        } else {
          const stats = await fs.promises.stat(fullPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            await fs.promises.unlink(fullPath);
            deletedCount++;
          }
        }
      }
    };

    await processDirectory(tenantDir);
    return deletedCount;
  }
}

// Singleton instance
let fileUploadServiceInstance: FileUploadService | null = null;

/**
 * Get FileUploadService singleton instance
 */
export function getFileUploadService(): FileUploadService {
  if (!fileUploadServiceInstance) {
    fileUploadServiceInstance = new FileUploadService();
  }
  return fileUploadServiceInstance;
}
