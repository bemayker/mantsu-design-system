import { cn } from './cn';
import { normalizeHex } from './contrast';

export interface ColorSwatchProps {
  /** A `#RRGGBB` hex colour, or `null`/an invalid value for the "no colour" state. */
  color: string | null;
  /** Diameter in px (12 in dropdowns, 16 in tables, 20 in a drawer read mode). */
  size?: 12 | 16 | 20 | number;
  /** Tooltip / accessible name for the swatch. */
  title?: string;
  /**
   * `data-testid` override. A caller rendering more than one swatch on a page
   * (every dropdown with coloured options) must pass a suffixed id, or the
   * ids collide and a test can only ever reach the first one.
   */
  testId?: string;
}

/**
 * Presentational display circle for an entity's colour: a filled circle for a
 * valid hex colour, or a neutral grey circle with a diagonal dash when
 * `color` is `null` or invalid.
 *
 * This is the read-only counterpart to `ColorSwatchPicker`, which is the
 * control for choosing one. Dynamic size and colour go through inline `style`
 * because neither is expressible as a utility class; everything else is.
 */
export function ColorSwatch({ color, size = 16, title, testId = 'color-swatch' }: ColorSwatchProps) {
  // `!= null` rather than `!== null`, so an `undefined` colour falls into the
  // "no colour" state instead of reaching `normalizeHex` and throwing on
  // `undefined.trim()`.
  const valid = color != null && normalizeHex(color) !== null;

  return (
    <span
      data-testid={testId}
      title={title}
      aria-label={title}
      role={title ? 'img' : undefined}
      style={{ width: size, height: size, backgroundColor: valid ? color : undefined }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full border',
        valid ? 'border-black/10' : 'border-slate-200 bg-white',
      )}
    >
      {!valid && <span aria-hidden="true" className="h-px w-1/2 rotate-45 bg-slate-400" />}
    </span>
  );
}
