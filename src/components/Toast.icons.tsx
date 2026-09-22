import React from 'react';

/**
 * The three glyphs `Toast` draws, inlined.
 *
 * Both apps' copies imported these from `lucide-react`, which this package
 * deliberately does not depend on: it has no runtime dependencies at all, and
 * adding an icon set for three paths would make every consumer carry it. The
 * suite rail makes the same trade the other way round — `SuiteNav` takes icons
 * as a prop precisely so the package need not know about lucide.
 *
 * Paths are lucide's own (ISC), matching `check-circle-2`, `x-circle` and `x`,
 * so the rendered mark is identical to what the apps shipped.
 */
const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...BASE} className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

export const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...BASE} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

export const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...BASE} className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
