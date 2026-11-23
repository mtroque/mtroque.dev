import { describe, expect, it } from 'vitest';
import { contrast, parseTokens } from '../scripts/check-contrast';

describe('contrast', () => {
  it('matches known WCAG ratios', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
  it('dark scheme inherits tokens it does not override', () => {
    const t = parseTokens(':root{--paper: #ffffff;--ink: #000000;}@media (prefers-color-scheme: dark){:root{--paper: #111111;}}');
    expect(t.dark).toEqual({ paper: '#111111', ink: '#000000' });
  });
});
