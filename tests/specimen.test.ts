import { describe, expect, it } from 'vitest';
import { specimenEnabled } from '../src/integrations/specimen';

describe('specimen route', () => {
  it('builds in dev, on Vercel previews and with SPECIMEN=1', () => {
    expect(specimenEnabled('dev', {})).toBe(true);
    expect(specimenEnabled('build', { VERCEL_ENV: 'preview' })).toBe(true);
    expect(specimenEnabled('build', { SPECIMEN: '1' })).toBe(true);
  });
  it('is absent from plain local builds', () => {
    expect(specimenEnabled('build', {})).toBe(false);
  });
  it('is never in a production build, and asking for it there fails', () => {
    expect(specimenEnabled('build', { VERCEL_ENV: 'production' })).toBe(false);
    expect(() => specimenEnabled('build', { VERCEL_ENV: 'production', SPECIMEN: '1' })).toThrow(/not allowed/);
  });
});
