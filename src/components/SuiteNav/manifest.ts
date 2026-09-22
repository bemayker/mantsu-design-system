/**
 * The suite manifest — types and parser.
 *
 * Normative document: `docs/suite-manifest.md`. JSON Schema:
 * `docs/suite-manifest.schema.json`. This file and those two are one artefact in
 * three forms, and a test asserts the examples satisfy all three.
 *
 * Everything here is data handling: no React, no fetch, no router. The consumer
 * fetches `GET /api/v1/suite/manifest` from its own backend and hands the parsed
 * JSON to `parseManifest`.
 */

/** The major version of the contract this parser implements. */
export const SUITE_MANIFEST_SCHEMA_VERSION = 1;

/**
 * The apps the suite ships today. Equal to the `appKey` Core publishes in the
 * role catalogue, so a rail row and a role assignment cannot disagree about
 * what an app is called.
 *
 * **This is the known set, not the allowed set** (NAV-19). It exists for
 * autocomplete and for fixtures; validation is `APP_KEY_PATTERN` below.
 */
export const SUITE_APP_KEYS = ['core', 'cockpit', 'downtimes', 'lists', 'reporting'] as const;

/**
 * Any well-formed key, with the shipped ones offered by autocomplete.
 *
 * The `string & {}` arm is what keeps both: TypeScript suggests the five known
 * keys while still accepting a sixth. A closed union would make adding an app a
 * release of this package that every consumer then has to bump, which is
 * exactly the coupling NAV-19 removes.
 */
export type SuiteAppKey = (typeof SUITE_APP_KEYS)[number] | (string & {});

/**
 * A lowercase slug. Deliberately narrow, because this value ends up in URLs, in
 * `data-` attributes and in a role-catalogue lookup: anything that needs
 * escaping in one of those does not belong here.
 */
export const APP_KEY_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;

/** `'configuration'` renders under the inert Configuration subtitle. */
export type SuiteNavGroup = 'configuration';

export interface SuiteNavLabel {
  en: string;
  nl: string;
}

export interface SuiteNavEntry {
  /** Stable per app, unique within that app's nav. */
  key: string;
  /** Both languages, always: the rail has no fallback language. */
  label: SuiteNavLabel;
  /** Path within that app, appended to the app's `url`. */
  path: string;
  /** `null` is an ordinary sub-item, and is explicit rather than omitted. */
  group: SuiteNavGroup | null;
}

export interface SuiteApp {
  key: SuiteAppKey;
  /** Display name as configured. Not translated: these are product names. */
  name: string;
  /** An icon key the consumer maps to a component, never markup. */
  icon: string;
  /** Public origin in this environment, without a trailing slash. */
  url: string;
  /** Rail order, ascending. Ties break on `key`. */
  order: number;
  /** The app's own rail items. Phase 2; absent in phase 1. */
  nav?: SuiteNavEntry[];
}

export interface SuiteLinks {
  dashboardUrl: string;
  settingsUrl: string;
}

export interface SuiteManifest {
  schemaVersion: number;
  /** Which app served this response. Always present in `apps`. */
  self: SuiteAppKey;
  /** Where the landscape came from. See `docs/suite-manifest.md`, Fallback. */
  source: 'core' | 'fallback';
  /** A relay is serving its last good copy because Core is unreachable right now. */
  stale?: boolean;
  /** Present exactly when `core` is in `apps`. */
  suite?: SuiteLinks;
  apps: SuiteApp[];
}

/** What the consumer needs in order to build a self-only manifest when the payload is unusable. */
export interface SelfDescription {
  self: SuiteAppKey;
  /** Display name for this app's own rail row. */
  selfName: string;
  /**
   * This app's own origin. Defaults to `window.location.origin` where there is
   * one, since a self-only rail links to itself.
   */
  selfUrl?: string;
  /** Icon key for this app's own row. Defaults to `self`. */
  selfIcon?: string;
}

export interface ParsedManifest {
  /**
   * Always renderable, degraded or not. This is the whole point: an operator
   * who opens Downtimes must reach Downtimes even when nothing else answers.
   */
  manifest: SuiteManifest;
  /**
   * True when the payload was rejected and `manifest` was built locally from
   * `SelfDescription` instead.
   */
  degraded: boolean;
  /** Human-readable, for `console.warn` and for logs. Never shown to an operator. */
  warnings: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAppKey = (value: unknown): value is SuiteAppKey =>
  typeof value === 'string' && APP_KEY_PATTERN.test(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isAbsoluteUrl = (value: unknown): value is string =>
  isNonEmptyString(value) && /^https?:\/\//.test(value);

function defaultSelfUrl(): string {
  // A DS component must not assume a DOM, so this stays defensive rather than
  // reaching for `window` directly.
  if (typeof globalThis !== 'undefined') {
    const location = (globalThis as { location?: { origin?: string } }).location;
    if (location && isNonEmptyString(location.origin)) return location.origin;
  }
  return '';
}

/**
 * The manifest a consumer renders when it has nothing else: itself, and nothing
 * around it. Identical in shape to what a relay serves when Core has never
 * answered, so the rail has one degraded path, not two.
 */
export function selfOnlyManifest(self: SelfDescription): SuiteManifest {
  return {
    schemaVersion: SUITE_MANIFEST_SCHEMA_VERSION,
    self: self.self,
    source: 'fallback',
    apps: [
      {
        key: self.self,
        name: self.selfName,
        icon: self.selfIcon ?? self.self,
        url: (self.selfUrl ?? defaultSelfUrl()).replace(/\/+$/, ''),
        order: 0,
      },
    ],
  };
}

function parseNavEntry(input: unknown, appKey: string, warnings: string[]): SuiteNavEntry | null {
  if (!isRecord(input)) {
    warnings.push(`Dropped a nav entry of ${appKey}: not an object.`);
    return null;
  }
  const { key, label, path, group } = input;
  if (!isNonEmptyString(key)) {
    warnings.push(`Dropped a nav entry of ${appKey}: missing key.`);
    return null;
  }
  if (!isRecord(label) || !isNonEmptyString(label.en) || !isNonEmptyString(label.nl)) {
    warnings.push(`Dropped nav entry ${appKey}/${key}: label needs both en and nl.`);
    return null;
  }
  if (!isNonEmptyString(path) || !path.startsWith('/')) {
    warnings.push(`Dropped nav entry ${appKey}/${key}: path must start with "/".`);
    return null;
  }

  // An unrecognised group is not fatal: the entry renders as an ordinary
  // sub-item. Adding a group means changing the document first.
  let parsedGroup: SuiteNavGroup | null = null;
  if (group === 'configuration') {
    parsedGroup = 'configuration';
  } else if (group !== null && group !== undefined) {
    warnings.push(
      `Nav entry ${appKey}/${key} has unknown group ${JSON.stringify(group)}; rendering it as an ordinary item.`,
    );
  }

  return { key, label: { en: label.en, nl: label.nl }, path, group: parsedGroup };
}

function parseApp(input: unknown, warnings: string[]): SuiteApp | null {
  if (!isRecord(input)) {
    warnings.push('Dropped an app: not an object.');
    return null;
  }
  const { key, name, icon, url, order, nav } = input;
  if (!isAppKey(key)) {
    // A key this parser has never heard of is fine and renders normally with
    // the generic icon (NAV-19): adding an app must be configuration, not a
    // release of this package. A MALFORMED key is still dropped, because this
    // value reaches URLs and `data-` attributes.
    warnings.push(`Dropped an app with malformed key ${JSON.stringify(key)}.`);
    return null;
  }
  if (!isNonEmptyString(name) || !isNonEmptyString(icon) || !isAbsoluteUrl(url)) {
    warnings.push(`Dropped app ${key}: name, icon and an absolute url are all required.`);
    return null;
  }
  if (typeof order !== 'number' || !Number.isFinite(order)) {
    warnings.push(`Dropped app ${key}: order must be a number.`);
    return null;
  }

  const app: SuiteApp = { key, name, icon, url: url.replace(/\/+$/, ''), order };

  if (Array.isArray(nav)) {
    app.nav = nav
      .map((entry) => parseNavEntry(entry, key, warnings))
      .filter((entry): entry is SuiteNavEntry => entry !== null);
  } else if (nav !== undefined) {
    warnings.push(`Ignored nav of app ${key}: not an array.`);
  }

  return app;
}

/** Rail order: `order` ascending, ties broken on `key` so the result is stable. */
export function sortApps(apps: SuiteApp[]): SuiteApp[] {
  return [...apps].sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
}

/**
 * Turn whatever the backend returned into something the rail can render.
 *
 * Never throws, never returns an empty `apps`, and never trusts the payload
 * further than the contract allows. Unknown fields are ignored on purpose: that
 * is what lets version 1 grow additively while four apps upgrade at their own
 * pace. A `schemaVersion` this parser does not implement is treated exactly like
 * an unreachable Core, because in both cases the consumer genuinely does not
 * know what the rest of the landscape is.
 */
export function parseManifest(input: unknown, self: SelfDescription): ParsedManifest {
  const warnings: string[] = [];
  const degrade = (reason: string): ParsedManifest => {
    warnings.push(reason);
    return { manifest: selfOnlyManifest(self), degraded: true, warnings };
  };

  if (!isRecord(input)) return degrade('Manifest payload is not an object.');

  const { schemaVersion, source } = input;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) {
    return degrade('Manifest has no integer schemaVersion.');
  }
  if (schemaVersion !== SUITE_MANIFEST_SCHEMA_VERSION) {
    return degrade(
      `Manifest schemaVersion ${schemaVersion} is not the ${SUITE_MANIFEST_SCHEMA_VERSION} this consumer implements; ` +
        'rendering this app only. Update @bemayker/mantsu-design-system.',
    );
  }
  if (source !== 'core' && source !== 'fallback') {
    return degrade(`Manifest source ${JSON.stringify(source)} is neither "core" nor "fallback".`);
  }

  const rawApps = input.apps;
  if (!Array.isArray(rawApps)) return degrade('Manifest has no apps array.');

  const apps = sortApps(
    rawApps.map((app) => parseApp(app, warnings)).filter((app): app is SuiteApp => app !== null),
  );
  if (apps.length === 0) return degrade('Manifest apps array holds nothing usable.');

  // `self` names the app that served the response, so a payload that omits it
  // from the landscape is inconsistent with itself. Trust the caller, which
  // knows which app it is running in, over the payload.
  let parsedSelf: SuiteAppKey;
  if (isAppKey(input.self) && apps.some((app) => app.key === input.self)) {
    parsedSelf = input.self;
  } else {
    warnings.push(
      `Manifest self ${JSON.stringify(input.self)} is not among its own apps; using ${self.self}.`,
    );
    parsedSelf = self.self;
    if (!apps.some((app) => app.key === parsedSelf)) {
      return degrade(`Manifest does not list ${self.self}, the app that served it.`);
    }
  }

  const manifest: SuiteManifest = { schemaVersion, self: parsedSelf, source, apps };

  if (input.stale === true) manifest.stale = true;

  const hasCore = apps.some((app) => app.key === 'core');
  const rawSuite = input.suite;
  if (isRecord(rawSuite) && isAbsoluteUrl(rawSuite.dashboardUrl) && isAbsoluteUrl(rawSuite.settingsUrl)) {
    if (hasCore) {
      manifest.suite = { dashboardUrl: rawSuite.dashboardUrl, settingsUrl: rawSuite.settingsUrl };
    } else {
      // Both targets live in Core. Linking to them without Core in the
      // landscape sends an operator to an origin the manifest just said is not
      // installed, so the rows are dropped instead.
      warnings.push('Manifest carries suite links but no Core app; dropping the Dashboard and Suite settings rows.');
    }
  } else if (rawSuite !== undefined) {
    warnings.push('Manifest suite needs an absolute dashboardUrl and settingsUrl; dropping it.');
  }

  return { manifest, degraded: false, warnings };
}

/**
 * The value for `data-suite-source` on the rail root, so an E2E test can assert
 * the degraded state instead of inferring it from a missing row.
 */
export function suiteSourceAttribute(manifest: SuiteManifest): 'core' | 'fallback' {
  return manifest.source;
}
