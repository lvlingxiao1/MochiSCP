import { describe, it, expect } from 'vitest';
import { formatFileSize, formatSpeed, octalToSymbolic } from './format';

describe('Format utilities', () => {
  it('formats file sizes properly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1024 * 5)).toBe('5 MB');
  });

  it('formats network speed properly', () => {
    expect(formatSpeed(0)).toBe('0 KB/s');
    expect(formatSpeed(512 * 1024)).toBe('512.0 KB/s');
    expect(formatSpeed(2 * 1024 * 1024)).toBe('2.0 MB/s');
  });

  it('converts octal permissions to symbolic string', () => {
    expect(octalToSymbolic('0755')).toBe('rwxr-xr-x');
    expect(octalToSymbolic('0644')).toBe('rw-r--r--');
    expect(octalToSymbolic('0700')).toBe('rwx------');
  });
});
