import { describe, expect, it } from 'vitest';
import {
  MAX_BATCH_BYTES,
  calculateBufferedFunding,
  computeTotalBytes,
  validateSelectedFiles,
} from '../../lib/validators';

describe('validators', () => {
  it('computes total bytes from selected files', () => {
    const files = [
      new File(['a'.repeat(5)], 'a.txt'),
      new File(['b'.repeat(10)], 'b.txt'),
    ];

    expect(computeTotalBytes(files)).toBe(15);
  });

  it('flags empty file selections', () => {
    const result = validateSelectedFiles([]);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('at least one file');
  });

  it('enforces batch size limit', () => {
    const payload = 'x'.repeat(MAX_BATCH_BYTES + 1);
    const result = validateSelectedFiles([new File([payload], 'huge.bin')]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('exceeds'))).toBe(true);
  });

  it('computes buffered funding with ceiling rounding', () => {
    expect(calculateBufferedFunding(100n)).toBe(105n);
    expect(calculateBufferedFunding(101n)).toBe(107n);
  });
});
