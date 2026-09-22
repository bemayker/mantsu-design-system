# Changelog

All notable changes to `@bemayker/mantsu-design-system`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
package follows [semantic versioning](https://semver.org/). See "Versioning" in the README
for what counts as breaking.

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
