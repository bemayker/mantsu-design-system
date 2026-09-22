import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import preset from '../tailwind-preset';
import { colors, tokens } from '../tokens/tokens';

// Read from disk rather than importing: the assertions below are about what
// npm will publish, not about a bundler-resolved copy.
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));

// The package contract is what four apps depend on. A rename here is a
// breaking change for all of them, so it is asserted rather than assumed.
describe('package contract', () => {
  it('publishes under the scoped name to GitHub Packages', () => {
    expect(pkg.name).toBe('@bemayker/mantsu-design-system');
    expect(pkg.private).toBeUndefined();
    expect(pkg.publishConfig.registry).toBe('https://npm.pkg.github.com');
    expect(pkg.files).toEqual(['dist']);
  });

  it('keeps react out of the dependency tree of consumers', () => {
    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.peerDependencies).toEqual({ react: '^18.3', 'react-dom': '^18.3' });
  });

  it('exposes the five documented entry points', () => {
    expect(Object.keys(pkg.exports).sort()).toEqual(
      ['.', './icons', './package.json', './styles.css', './tailwind-preset', './tokens'].sort(),
    );
  });
});

describe('tailwind preset', () => {
  it('carries the token colours Tailwind utilities are built from', () => {
    expect(preset.theme.extend.colors.midnight).toBe(colors.midnight);
    expect(preset.theme.extend.colors['primary-blue']).toBe(colors.primaryBlue);
    expect(preset.theme.extend.colors.frost).toBe(colors.frost);
  });

  it('carries the suite navigation tokens NAV-2 added', () => {
    // These four came from the menu-unification handoff, not from Figma, so a
    // regeneration of tokens.ts from Figma could silently drop them. The rail
    // would then render without its active bar and without its divider.
    expect(preset.theme.extend.colors['accent-blue']).toBe(colors.accentBlue);
    expect(preset.theme.extend.colors['rail-divider']).toBe(colors.railDivider);
    expect(preset.theme.extend.colors['blue-tint']).toBe(colors.blueTint);
    expect((preset.theme.extend.colors.slate as Record<string, string>)[100]).toBe(colors.slate100);
  });

  it('mirrors tokens.ts rather than inventing values', () => {
    expect(preset.theme.extend.backgroundImage['primary-gradient']).toBe(tokens.gradients.primary);
    expect(preset.theme.extend.boxShadow['mantsu-lg']).toBe(tokens.shadows.large);
    expect(preset.theme.extend.borderRadius.md).toBe(tokens.radii.md);
    expect(preset.theme.extend.borderRadius.xl).toBe(tokens.radii.xl);
  });

  it('carries the title face and the large radius the three apps each declared (1.4.0)', () => {
    // Core, Downtimes and the Order Cockpit all extended the preset with
    // exactly these two values. The suite shell extends nothing, so until they
    // lived here `font-title` generated no CSS in it at all and `rounded-xl`
    // fell back to Tailwind's 12px.
    expect(preset.theme.extend.fontFamily.title).toEqual(['DM Sans', 'Lato', 'sans-serif']);
    expect(tokens.typography.titleFontFamily).toBe("'DM Sans', 'Lato', sans-serif");
    expect(preset.theme.extend.borderRadius.xl).toBe('16px');
  });
});
