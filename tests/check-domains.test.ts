import { describe, expect, it } from 'vitest';
import { findDomainHits } from '../scripts/check-domains';

describe('check:domains', () => {
  it('flags the custom domain used as a host', () => {
    expect(findDomainHits('const u = "https://mtroque.dev/og.png"')).toHaveLength(1);
    expect(findDomainHits('www.mtroque.dev')).toHaveLength(1);
  });
  it('flags this project vercel.app hosts', () => {
    expect(findDomainHits('https://mtroque-dev.vercel.app')).toHaveLength(1);
    expect(findDomainHits('mtroque-dev-git-main-mtroque.vercel.app')).toHaveLength(1);
  });
  it('allows the GitHub repo path and other projects', () => {
    expect(findDomainHits('https://github.com/mtroque/mtroque.dev')).toHaveLength(0);
    expect(findDomainHits('https://tablekeeper-beryl.vercel.app')).toHaveLength(0);
  });
});
