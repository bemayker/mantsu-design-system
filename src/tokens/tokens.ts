/**
 * Mantsu Design System — Design Tokens
 * ------------------------------------------------------------------
 * Single source of truth, extracted verbatim from the Figma Design
 * System file (kN9ZMAZ7NrhNp0iu8gpzEC).
 *
 * Do not hand-edit colour or type values: regenerate from Figma so
 * this file stays the canonical reference for both Storybook and any
 * AI codegen (Cursor) that consumes the system.
 *
 * Font family: Lato (Regular 400, Medium 500, Bold 700).
 */

export const colors = {
  // Primary MANTSU
  primaryBlue: '#155799',
  primaryNeutral: '#0f172a',
  primaryOrange: '#ff5640',

  // Gradient accent stops
  gradientMagenta: '#c70c5b',
  gradientCoral: '#e8824f',

  // Enterprise Blue Scale
  midnight: '#00193f',
  atlantic: '#092755',
  horizon: '#155799',
  skyMist: '#bcddff',
  frost: '#eef6f8',
  selectedBlue: '#eff6ff',

  // Suite navigation (NAV-2). From the menu-unification handoff rather than the
  // Figma Design System file, which does not carry them yet. Regenerating the
  // block above from Figma must not drop these four.
  accentBlue: '#3b9eff',
  railDivider: '#0f2f60',
  blueTint: '#eaf2fb',

  // Neutral Colors
  slate950: '#0c1222',
  slate600: '#475569',
  slate500: '#717680',
  slate400: '#94a3b8',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  slate50: '#f8fafc',
  white: '#ffffff',

  // Status
  info: '#3588db',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#f43f5e',

  // Status backgrounds
  infoBg: '#eff6ff',
  successBg: '#f0fdf4',
  warningBg: '#fff7ed',
  errorBg: '#fff1f2',
} as const;

/**
 * Primary gradient — diagonal magenta → coral.
 * Figma transform [[0,1,0],[-0.5,0,0.75]] ≈ a ~135deg diagonal.
 * The two-stop CSS below is visually equivalent to the 15-stop Figma fill.
 */
export const gradients = {
  primary: 'linear-gradient(135deg, #c70c5b 0%, #e8824f 100%)',
} as const;

export const typography = {
  fontFamily: "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  /**
   * Drawer, card and section titles. Core, Downtimes and the Order Cockpit each
   * declared this in their own Tailwind config, identically, so the one
   * frontend that hosts all three had none of them and rendered those titles
   * in Lato. Added in 1.4.0.
   */
  titleFontFamily: "'DM Sans', 'Lato', sans-serif",
  weights: { regular: 400, medium: 500, bold: 700 },
  // name: [fontSize px, lineHeight px | 'auto', weight]
  styles: {
    h1: { fontSize: 36, lineHeight: 40, weight: 700 },
    h2: { fontSize: 24, lineHeight: 32, weight: 700 },
    h3: { fontSize: 20, lineHeight: 28, weight: 700 },
    h4: { fontSize: 18, lineHeight: 'auto', weight: 700 },
    bodyLarge: { fontSize: 16, lineHeight: 'auto', weight: 700 },
    bodyEmphasis: { fontSize: 16, lineHeight: 'auto', weight: 500 },
    bodyParagraph: { fontSize: 16, lineHeight: 'auto', weight: 400 },
    bodySmallEmphasis: { fontSize: 14, lineHeight: 'auto', weight: 700 },
    bodySmallCaption: { fontSize: 14, lineHeight: 'auto', weight: 400 },
    bodySmallestEmphasis: { fontSize: 12, lineHeight: 'auto', weight: 700 },
    bodySmallestCaption: { fontSize: 12, lineHeight: 'auto', weight: 400 },
  },
} as const;

export const shadows = {
  small: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
  medium: '0 1px 1px 0 rgba(10, 13, 18, 0.05)',
  large: '0 8px 12px -4px rgba(21, 21, 21, 0.25)',
} as const;

/**
 * Spacing — 4px base scale. The Figma "Spacing System" page demonstrates
 * usage rather than declaring named tokens, so this is the standard scale
 * the components are built against. Adjust if Figma later exposes variables.
 */
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const radii = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  /**
   * Large panels: modals, drawers, dashboard cards. Same story as
   * `typography.titleFontFamily`: three apps declared it, identically, and the
   * shell hosting them had it from none. Added in 1.4.0.
   */
  xl: '16px',
  full: '9999px',
} as const;

export const tokens = { colors, gradients, typography, shadows, spacing, radii };
export default tokens;
