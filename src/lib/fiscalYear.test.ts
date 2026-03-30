import { describe, it, expect, vi, afterEach } from 'vitest';
import { getFiscalYear } from './fiscalYear';

describe('getFiscalYear', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns YY-YY format string', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15'));
    expect(getFiscalYear()).toMatch(/^\d{2}-\d{2}$/);
  });

  it('April starts new fiscal year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-04-01'));
    expect(getFiscalYear()).toBe('25-26');
  });

  it('March is still previous fiscal year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-31'));
    expect(getFiscalYear()).toBe('24-25');
  });

  it('January is in the fiscal year that started previous April', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15'));
    expect(getFiscalYear()).toBe('25-26');
  });

  it('December is in the fiscal year that started same year April', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-31'));
    expect(getFiscalYear()).toBe('25-26');
  });
});
