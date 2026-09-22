/**
 * Mantsu Design System — Tailwind preset
 * ------------------------------------------------------------------
 * The canonical Tailwind theme for the Mantsu MES UI, mirroring
 * `src/tokens/tokens.ts`. Consuming apps add it as a preset instead of
 * hand-copying colour and type values:
 *
 *   // tailwind.config.js
 *   const mantsu = require('@bemayker/mantsu-design-system/tailwind-preset');
 *   module.exports = {
 *     presets: [mantsu],
 *     content: [
 *       './src/**\/*.{ts,tsx}',
 *       './node_modules/@bemayker/mantsu-design-system/dist/**\/*.js',
 *     ],
 *   };
 *
 * The second `content` entry is required: this package ships JavaScript, not
 * a prebuilt stylesheet, so the consumer's Tailwind build is what generates
 * the utility classes our components reference. See README.md, "Styling".
 *
 * This repo's own `tailwind.config.js` consumes the same preset, so Storybook
 * and every app render from one theme definition.
 */

// Tailwind's own `Config` type is a devDependency here and not something a
// consumer should be forced to install, so the preset is typed structurally.
// The font-size entries are tuples, not arrays: Tailwind's schema requires
// exactly [size, configuration], and a widened `string[]` is rejected by it.
type FontSizeEntry = [
  fontSize: string,
  configuration: { lineHeight?: string; letterSpacing?: string; fontWeight?: string },
];

export type MantsuTailwindPreset = {
  theme: {
    extend: {
      colors: Record<string, string | Record<string, string>>;
      backgroundImage: Record<string, string>;
      fontFamily: Record<string, string[]>;
      fontSize: Record<string, FontSizeEntry>;
      boxShadow: Record<string, string>;
      borderRadius: Record<string, string>;
    };
  };
  plugins: never[];
};

export const preset: MantsuTailwindPreset = {
  theme: {
    extend: {
      colors: {
        'primary-blue': '#155799',
        'primary-neutral': '#0f172a',
        'primary-orange': '#ff5640',
        midnight: '#00193f',
        atlantic: '#092755',
        horizon: '#155799',
        'sky-mist': '#bcddff',
        frost: '#eef6f8',
        'selected-blue': '#eff6ff',
        // Suite navigation (NAV-2).
        'accent-blue': '#3b9eff',
        'rail-divider': '#0f2f60',
        'blue-tint': '#eaf2fb',
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          400: '#94a3b8',
          500: '#717680',
          600: '#475569',
          950: '#0c1222',
        },
        info: '#3588db',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#f43f5e',
        'info-bg': '#eff6ff',
        'success-bg': '#f0fdf4',
        'warning-bg': '#fff7ed',
        'error-bg': '#fff1f2',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #c70c5b 0%, #e8824f 100%)',
      },
      fontFamily: {
        sans: ['Lato', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        // `font-title`. `tokens.typography.titleFontFamily`; loaded by `styles.css`.
        title: ['DM Sans', 'Lato', 'sans-serif'],
      },
      fontSize: {
        h1: ['36px', { lineHeight: '40px', fontWeight: '700' }],
        h2: ['24px', { lineHeight: '32px', fontWeight: '700' }],
        h3: ['20px', { lineHeight: '28px', fontWeight: '700' }],
        h4: ['18px', { fontWeight: '700' }],
        'body-lg': ['16px', { fontWeight: '700' }],
        'body-emphasis': ['16px', { fontWeight: '500' }],
        body: ['16px', { fontWeight: '400' }],
        'body-sm-emphasis': ['14px', { fontWeight: '700' }],
        'body-sm': ['14px', { fontWeight: '400' }],
        'body-xs-emphasis': ['12px', { fontWeight: '700' }],
        'body-xs': ['12px', { fontWeight: '400' }],
      },
      boxShadow: {
        'mantsu-sm': '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
        'mantsu-md': '0 1px 1px 0 rgba(10, 13, 18, 0.05)',
        'mantsu-lg': '0 8px 12px -4px rgba(21, 21, 21, 0.25)',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        // `rounded-xl`. Tailwind's own default is 12px, the same as `lg`, which
        // is the value every app used to override.
        xl: '16px',
      },
    },
  },
  plugins: [],
};

export default preset;
