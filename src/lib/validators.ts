import { formatEther } from 'viem';
import type { FileValidationResult } from '../types/domain';

export const MAX_BATCH_BYTES = 100 * 1024 * 1024;

export function computeTotalBytes(files: File[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}

export function validateSelectedFiles(files: File[]): FileValidationResult {
  const errors: string[] = [];
  const totalBytes = computeTotalBytes(files);

  if (files.length === 0) {
    errors.push('Select at least one file.');
  }

  if (totalBytes > MAX_BATCH_BYTES) {
    errors.push(`Total selected size exceeds ${humanFileSize(MAX_BATCH_BYTES)}.`);
  }

  return {
    valid: errors.length === 0,
    totalBytes,
    errors,
  };
}

export function calculateBufferedFunding(wei: bigint, bufferPercent = 5n): bigint {
  if (wei < 0n) throw new Error('Funding amount must be non-negative.');
  if (bufferPercent < 0n) throw new Error('Buffer percent must be non-negative.');

  const numerator = wei * (100n + bufferPercent);
  return (numerator + 99n) / 100n;
}

export function humanFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  const unit = units[exponent] ?? 'B';
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${unit}`;
}

export function formatWeiAsEth(wei: bigint): string {
  const formatted = formatEther(wei);
  const [whole = '0', fractional = ''] = formatted.split('.');
  if (!fractional || /^0+$/.test(fractional)) return whole;
  return `${whole}.${fractional.slice(0, 6).replace(/0+$/, '')}`;
}
