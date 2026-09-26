# Changelog

All notable changes to `@bemayker/mantsu-design-system`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
package follows [semantic versioning](https://semver.org/). See "Versioning" in the README
for what counts as breaking.

## 1.7.0

### Added

- `Pagination` and `getPageRange` (UI-20.1). The Make pager: first / previous,
  a one-line summary, next / last, centred and borderless. Chrome only: the
  caller passes the translated summary and the four button names, so the
  package still carries no i18n. `showFirstLast` (default `true`) drops the
  outer pair; `testId` prefixes the parts (`-first`, `-prev`, `-summary`,
  `-next`, `-last`). `getPageRange(page, pageSize, total)` returns the clamped
  page, the page count and the 1-based `from` / `to` a summary needs.
  Replaces four diverged copies in `mantsu-ui` (Cockpit, Downtimes, Lists,
  Core).

## 1.6.0

### Added

- `DateTimePicker` gains `onValidityChange?: (valid: boolean) => void`
  (CORE-FB-23). `DatePicker` and `TimeField` already reported their own
  resolvability, but `DateTimePicker` consumed both signals internally and
  forwarded neither, so a form could not tell "an invalid entry on screen"
  from "the value it last reported" without reading the DOM. `valid` is
  judged from each half's CURRENT text, not only its last committed value
  (`DatePicker` and `TimeField` both gain a matching internal `onEmptyChange`
  for this, so a deferred entry such as a pending two-digit year counts the
  instant it stops being empty, not only once it commits). It is `false`
  whenever either half's current text is invalid (including out of
  `min`/`max`), whenever either half holds text that is typed but not yet
  committed and would not commit to a valid value (so `Enter` without a blur
  is covered too), or whenever exactly one half holds text while the other is
  empty; `true` when both halves are empty or both resolve to a valid value
  (a pending two-digit year that will commit on blur still counts as valid,
  because it resolves). It fires once on mount with the real initial state
  (accounting for an initial value that is outside `min`/`max`), then only
  when the combined signal actually changes.
- `DateTimePicker` gains `datePlaceholder` and `timePlaceholder`, passed
  through to the date and time halves respectively (defaults unchanged:
  `DD/MM/YYYY` and `HH:MM`).

## 1.5.0

### Added

- `DatePicker`, a date field typed as `DD/MM/YYYY` in every language, with an
  optional, minimal Monday-first calendar popover (CORE-FB-23). The native
  `<input type="date">` it replaces renders in the operating system's locale
  and cannot be told the app's language, so the same date read `06/07/2026` in
  a table and `07/06/2026` in the drawer next to it. Values go in and out as
  ISO `YYYY-MM-DD` strings (or `null`) and never pass through a `Date` built
  from the value, so no browser time zone can shift a whole-day value.
  Separators `/`, `-` and `.`; single-digit day and month; a four-digit year is
  reported on the keystroke that completes it (so Playwright's `fill()` needs
  no blur), a two-digit year means 20xx and is reported on blur or Enter only.
  An invalid or out-of-range entry keeps its text, sets `aria-invalid` and
  never calls `onChange`. `locale` drives month and weekday names only;
  `labels` carries the component's English strings with per-key overrides, as
  `Tree` does.
- `TimeField`, a 24-hour `HH:MM` text field, because `<input type="time">`
  shows AM/PM on a US-configured machine. Midnight is `00:00`, never `24:00`.
- `DateTimePicker`, the two side by side, replacing
  `<input type="datetime-local">`. Its value is the same `YYYY-MM-DDTHH:MM`
  string the native input produced, so consumers' wire conversions stay
  byte-identical; a half-filled entry reports nothing.
- `DatePicker` and `TimeField` also read digits with no separator at all:
  `DDMMYYYY` or `DDMMYY` for the date, `HHMM` or `HMM` for the time. Both
  fields render with `inputMode="numeric"`, and the iPad numeric keypad it
  opens has no `/`, `-`, `.` or `:` key, so an operator on a shop-floor tablet
  had no separator to type. `DDMMYYYY` and `HHMM` commit on the completing
  keystroke, the same as their separated equivalents; `DDMMYY` and `HMM`
  commit only on blur or Enter, since either is also the start of a longer
  entry (`DDMMYY` of `DDMMYYYY`, `HMM` of `HHMM`).

### Test ids: a deliberate difference from `Dropdown`

`DatePicker` and `TimeField` put `data-testid={testId}` on the **text input**,
not on a wrapper, and derive the popover's ids from it (`-toggle`, `-calendar`,
`-prev`, `-next`, `-month-label`, `-grid`, `-day-YYYY-MM-DD`, `-today`,
`-clear`, `-error`, `-hint`). Every spec that drove the native date inputs types into
the element it names, so they keep working with a new value shape and no id
rewrites. `DateTimePicker` has two inputs, so its `testId` names the group and
the inputs are `${testId}-date` and `${testId}-time`.

Not breaking: three new components, no change to an existing export.

## 1.4.0

### Added

- `font-title` in the preset (`fontFamily.title`: DM Sans, then Lato) and
  `tokens.typography.titleFontFamily`, with DM Sans loaded by `styles.css`.
- `rounded-xl` at 16px in the preset (`borderRadius.xl`) and `tokens.radii.xl`.

Core, Downtimes and the Order Cockpit each declared both values in their own
Tailwind config, identically. The suite shell (`mantsu-ui`) extends nothing,
because a value missing from the preset belongs here, so since the first port
it rendered drawer and section titles in Lato and large panels at Tailwind's
12px default. Three apps agreeing is the promotion condition.

Not breaking for anyone measured: the three apps already used exactly these
values, and neither the package's own components nor Lists use `font-title` or
`rounded-xl`. An app that relied on Tailwind's 12px `rounded-xl` without
overriding it would see 16px; none does. The three apps can drop their local
`theme.extend` entries once they are on 1.4.0.

## 1.3.1

_Backfilled at 1.4.0; this release shipped without an entry._

### Fixed

- `Toast` carries `data-toast-variant` again. 1.3.0 dropped it, and Downtimes'
  E2E specs match on it in 57 places.

## 1.3.0

_Backfilled at 1.4.0; this release shipped without an entry._

### Added

- `DataTable` (with `DataTableColumn`), the adapter over `Table` that Core and
  Downtimes both shipped, promoted from Downtimes' superset copy.

### Changed

- `Toast`, `ToastProvider` and `useToast` are now the component Core and
  Downtimes rendered (`message`/`onDismiss`, `role="alert"` on errors). The
  previous, unused `Toast` (`title`/`description`/`onClose`, four variants) is
  gone.

## 1.2.0

### Added

- `Dropdown`, the suite's combobox. It was written in `mantsu-core` as
  `CustomDropdown` because this package had no select at all, and Downtimes
  then vendored it and extended it. This is that superset, promoted: the full
  WAI-ARIA combobox-with-listbox-popup keyboard contract (arrows, `Home`/`End`,
  `Enter`, `Space`, `Escape`, `Tab`, typeahead, `aria-activedescendant`),
  optional `searchable` filtering with an `onSearchChange` escape hatch for
  server-side option sets, `defaultOpen`, `required`, `clearable`, and coloured
  options. Its 27 tests came across unchanged from the app copy and pass
  against it, which is the evidence the promotion is behaviour-preserving.
- `ColorSwatch`, the read-only counterpart to `ColorSwatchPicker`. Two apps had
  vendored it, and both recorded "validates hex through this app's own helper"
  as a permanent divergence. They no longer need to: `normalizeHex` has been in
  `contrast` here the whole time.
- `useEscapeKey`, and every overlay in the package now routes Escape through
  it. See Fixed.
- `Switch` takes `testId` and `ariaLabel`. A switch inside a settings grid has
  no visible `label` of its own, because the grid owns it as a sibling element,
  so the control was an unnamed `role="switch"`: unannounced, and unreachable
  by `getByRole('switch', { name })`.
- `Tree` takes `archivedBadgeVisible`, and `TreeLabels` takes `archivedBadge`.
  See Fixed.
- `Table` gains the fifteen props its two vendored copies had added: `rowKey`,
  `rowTestId`, `rowClassName`, `rowProps`, `onRowClick`, `onRowDoubleClick`,
  `onRowContextMenu`, `testId`, `sortMode`, `loading`, `skeletonRowCount`,
  `footerRow`, and `width` / `cellClassName` / `headerClassName` on a column.
  Its generic constraint is relaxed from `T extends Record<string, any>` to
  `T`, and the container scrolls horizontally rather than clipping when fixed
  column widths exceed it. All additive: a caller that passes none of them is
  unchanged.

### Changed

- **`Table`'s default cell output, for a column with no `render`.** It was
  `String(value ?? '')`; the vendored copies returned the raw value instead.
  Neither was adopted wholesale, because each regresses the other's consumers:
  the raw value renders JSX and **throws** on a plain object ("Objects are not
  valid as a React child" — verified, not assumed), and `String()` never throws
  but prints `[object Object]` and prints `"false"` where the copies print
  nothing.

  It now renders strings, numbers, arrays and elements as themselves, renders
  nothing for `null`, `undefined` and `false`, and stringifies anything else.
  That is what each side wanted in the case it cared about, and a shared
  component does not take a page down over a column someone forgot to give a
  `render`.

### Fixed

- **Escape closed every open overlay at once, not the topmost one.** `Modal`,
  `SideDrawer` and the `Table` and `Tree` context menus each attached their own
  `document` keydown listener and closed themselves on any press, so a control
  opened inside a dialog took the dialog down with it: the operator lost the
  form they were filling in and got no explanation.

  Nothing made this visible. Each component's own tests open exactly one
  overlay, so all four listeners behaved perfectly in isolation, and the bug
  only exists in composition. `useEscapeKey.test.tsx` is therefore a
  composition suite, and three of its cases were run against the old
  implementation and fail on it.

  No API changed. An overlay that took `onClose` still takes `onClose`.

- **An archived `Tree` node was announced to nobody.** `archived` rendered as
  `opacity-60` and nothing else, which is meaning carried by appearance alone
  (WCAG 2.2 SC 1.4.1) — and a real failure rather than a formal one, because in
  the consuming apps `archived` decides whether a node may still be chosen.

  The state is now always rendered for assistive technology. Whether it is also
  **visible** is the new `archivedBadgeVisible`, off by default, so the
  muted-only look this package chose when `archived` landed is unchanged for
  everyone who does not ask for the badge.

## 1.1.0

### Added

- `SuiteNav` takes a `testIdPrefix`, prepended to every `data-testid` it emits.
  An app renders the rail twice, once as the desktop rail and once inside its
  mobile drawer, and below the breakpoint both are in the DOM at the same time.
  Without a prefix every id exists twice on one page: ambiguous in Testing
  Library, an error in Playwright's strict mode. The drawer passes `'mobile-'`;
  the rail passes nothing and is unchanged.


## [1.0.0] - 2026-09-12

First published version. The repo was source-only before this; apps took vendored copies.

### Added

- The repo is a publishable npm package, `@bemayker/mantsu-design-system`, on GitHub
  Packages (NAV-13, founder decision of 2026-09-12, reversing option A of `86cb41584`
  for new components).
- Build with tsup: ESM, CJS and type declarations for four entry points (`.`, `./tokens`,
  `./tailwind-preset`, `./icons`), plus `./styles.css`.
- Tailwind preset (`src/tailwind-preset.ts`), so a consuming app declares no tokens of its
  own. This repo's own `tailwind.config.ts` consumes the same preset.
- Vitest, with a package-contract suite and component render smoke tests. The repo had no
  tests before.
- A consumer smoke test app in `examples/consumer/`, run in CI against the packed tarball.
- `.github/workflows/publish.yml` (tag-driven publish) and `.github/workflows/ci.yml`
  (typecheck, test, build, consumer smoke test on every pull request).
- The suite manifest contract (NAV-4): `docs/suite-manifest.md` as the normative
  document, `docs/suite-manifest.schema.json` for producer validation,
  `docs/examples/` with the three cases, and `parseManifest` plus the manifest types in
  `src/components/SuiteNav/manifest.ts`, exported from the package root. A test asserts
  the document, the schema, the parser and the examples still agree.
- `SuiteNav` (NAV-2), the suite navigation rail: app rows, submenus, the inert
  *Configuration* subtitle, badges, a pinned Settings row and a touch density. Pure
  presentation: no router, no i18n, no fetch, no `localStorage`. Ten Storybook stories
  and 32 tests.
- `SettingsScopePage` (NAV-3), the settings chrome: a scope column and a row list.
  `scopesFromManifest` derives the column from the suite manifest, so a scope for an
  app this landscape does not have cannot appear, the `suite` scope exists only where
  Core does, and an app with no settings gets no scope. Four stories, 21 tests.
- Four suite navigation tokens in `tokens.ts` and the preset together: `accent-blue`,
  `rail-divider`, `blue-tint` and `slate.100`. These come from the menu-unification
  handoff rather than the Figma file, so a regeneration from Figma must not drop them; a
  test fails if it does.
- The four Mantsu module icons (`ModuleCockpit`, `ModuleDowntimes`, `ModuleLists`,
  `ModuleReporting`) under `./icons`, generated from the handoff's SVG sheet by
  `scripts/generate-module-icons.mjs`. Core keeps a Lucide stand-in supplied by the app.

### Changed

- `react` and `react-dom` moved from `dependencies` to `peerDependencies` (`^18.3`).
- `tailwind.config.js` became `tailwind.config.ts` and now derives its theme from the
  preset rather than re-declaring token values.
- The webfont and root font-family moved from `src/styles/globals.css` into
  `src/styles/package.css`, the file published as `./styles.css`.

### Not changed

- The six vendored copies in the apps (`dsTree`, `dsTable`, `dsColorPicker`, `dsDropdown`,
  `dsSwitch`, `DataTable`) stay vendored. Migrating them is a separate story.
