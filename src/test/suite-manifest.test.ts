import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

import {
  SUITE_MANIFEST_SCHEMA_VERSION,
  parseManifest,
  selfOnlyManifest,
  sortApps,
  suiteSourceAttribute,
  type SuiteManifest,
} from '../components/SuiteNav/manifest';

const docsDir = resolve(process.cwd(), 'docs');
const examplesDir = resolve(docsDir, 'examples');
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

const schema = readJson(resolve(docsDir, 'suite-manifest.schema.json'));
const doc = readFileSync(resolve(docsDir, 'suite-manifest.md'), 'utf8');

let validate: ValidateFunction;
beforeAll(() => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  validate = ajv.compile(schema);
});

const exampleFiles = readdirSync(examplesDir)
  .filter((name) => name.endsWith('.json'))
  .sort();

// The manifest is a protocol between six moving parts. The document, the schema
// and the parser can each drift from the other two without anything failing at
// runtime until an operator sees an empty rail, so the examples are the pin that
// holds all three together.
describe('the three forms of the contract agree', () => {
  it('ships the three documented examples', () => {
    expect(exampleFiles).toEqual([
      'manifest-core-only.json',
      'manifest-full-landscape.json',
      'manifest-lists-standalone.json',
    ]);
  });

  it.each(exampleFiles)('%s satisfies the schema', (name) => {
    const valid = validate(readJson(resolve(examplesDir, name)));
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  it.each(exampleFiles)('%s parses without degrading or warning', (name) => {
    const payload = readJson(resolve(examplesDir, name)) as SuiteManifest;
    const parsed = parseManifest(payload, { self: payload.self, selfName: 'Self' });
    expect(parsed.warnings).toEqual([]);
    expect(parsed.degraded).toBe(false);
    expect(parsed.manifest.apps.length).toBe(payload.apps.length);
  });

  it('states the version this parser implements', () => {
    expect(schema.properties.schemaVersion.const).toBe(SUITE_MANIFEST_SCHEMA_VERSION);
    expect(doc).toContain('# The suite manifest');
  });

  it('spells out how nav is published, including the scope each app requires', () => {
    // NAV-6 phase 2. The scope prefix is the app's own name for itself, not its
    // suite key, and getting it wrong is a 403 that reads like a key problem.
    // That cost a round trip against the real stack, so it is written down.
    expect(doc).toContain('### Publishing `nav`: `GET /api/v1/suite/nav`');
    expect(doc).toContain('ordercockpit:suite:read');
    expect(doc).toContain('downtimes:suite:read');
    expect(doc).toContain('lists:suite:read');
  });

  it('spells out the versioning and fallback rules in the document, not only in code', () => {
    // AC of NAV-4: the rules are normative prose, so that NAV-5 and NAV-6 can
    // implement them without reading TypeScript.
    expect(doc).toContain('## Versioning');
    expect(doc).toContain('## Fallback');
    expect(doc).toContain('data-suite-source="fallback"');
    expect(doc).toMatch(/\*\*2 seconds\*\*/);
    expect(doc).toMatch(/\*\*5 minutes\*\*/);
  });
});

describe('the documented example cases', () => {
  it('a full landscape carries suite links and phase-2 nav', () => {
    const m = readJson(resolve(examplesDir, 'manifest-full-landscape.json')) as SuiteManifest;
    expect(m.source).toBe('core');
    expect(m.suite?.dashboardUrl).toMatch(/^http/);
    expect(m.apps.map((a) => a.key)).toEqual(['core', 'cockpit', 'downtimes', 'lists', 'reporting']);
    const cockpit = m.apps.find((a) => a.key === 'cockpit');
    expect(cockpit?.nav?.filter((n) => n.group === 'configuration')).toHaveLength(2);
  });

  it('standalone Lists is indistinguishable from an outage', () => {
    const m = readJson(resolve(examplesDir, 'manifest-lists-standalone.json')) as SuiteManifest;
    expect(m.source).toBe('fallback');
    expect(m.suite).toBeUndefined();
    expect(m.apps).toHaveLength(1);
    expect(suiteSourceAttribute(m)).toBe('fallback');
  });

  it('Core alone still offers the suite dashboard', () => {
    const m = readJson(resolve(examplesDir, 'manifest-core-only.json')) as SuiteManifest;
    expect(m.source).toBe('core');
    expect(m.suite).toBeDefined();
    expect(m.apps).toHaveLength(1);
  });
});

// A producer emitting an undefined field is a bug; a consumer receiving one is
// not. Those are two different validation stances and the schema serves only the
// first, so both halves are asserted.
describe('schema rejects what a producer must not emit', () => {
  const base = () => readJson(resolve(examplesDir, 'manifest-core-only.json'));

  it('an undefined top-level field', () => {
    expect(validate({ ...base(), somethingNew: true })).toBe(false);
  });

  it('a malformed app key', () => {
    // NAV-19: the set is OPEN, so `warehouse` is valid and asserted below. What
    // the schema still refuses is a key that is not a slug, because this value
    // reaches URLs, `data-` attributes and a role-catalogue lookup.
    for (const bad of ['Warehouse', 'ware house', 'ware/house', '1warehouse', 'w', '']) {
      const m = base();
      m.apps[0].key = bad;
      expect(validate(m), `expected the schema to reject ${JSON.stringify(bad)}`).toBe(false);
    }
  });

  it('accepts an app key the suite does not ship yet', () => {
    const m = base();
    m.apps[0].key = 'warehouse';
    m.self = 'warehouse';
    expect(validate(m)).toBe(true);
  });

  it('an app url with a trailing slash', () => {
    const m = base();
    m.apps[0].url = 'http://core.10.10.10.4.nip.io/';
    expect(validate(m)).toBe(false);
  });

  it('a nav entry that omits group rather than setting it to null', () => {
    const m = base();
    delete m.apps[0].nav[0].group;
    expect(validate(m)).toBe(false);
  });

  it('a nav label with only one language', () => {
    const m = base();
    m.apps[0].nav[0].label = { en: 'Locations' };
    expect(validate(m)).toBe(false);
  });

  it('source fallback alongside suite links or a second app', () => {
    const withSuite = { ...base(), source: 'fallback' };
    expect(validate(withSuite)).toBe(false);

    const twoApps = base();
    twoApps.source = 'fallback';
    delete twoApps.suite;
    twoApps.apps.push({ ...twoApps.apps[0], key: 'lists', order: 20 });
    expect(validate(twoApps)).toBe(false);
  });
});

describe('parseManifest degrades instead of failing', () => {
  const self = { self: 'downtimes', selfName: 'Downtimes', selfUrl: 'http://downtimes.example' } as const;

  it('builds a self-only manifest from a payload that is not an object', () => {
    const parsed = parseManifest('<html>gateway timeout</html>', self);
    expect(parsed.degraded).toBe(true);
    expect(parsed.manifest.apps).toHaveLength(1);
    expect(parsed.manifest.apps[0].key).toBe('downtimes');
    expect(parsed.manifest.source).toBe('fallback');
    expect(parsed.warnings).toHaveLength(1);
  });

  it('renders this app only when the payload is a newer major', () => {
    const payload = { ...readJson(resolve(examplesDir, 'manifest-full-landscape.json')), schemaVersion: 2 };
    const parsed = parseManifest(payload, self);
    expect(parsed.degraded).toBe(true);
    expect(parsed.manifest.apps.map((a) => a.key)).toEqual(['downtimes']);
    expect(parsed.warnings[0]).toContain('schemaVersion 2');
  });

  it('treats an older major the same way, rather than guessing', () => {
    const payload = { ...readJson(resolve(examplesDir, 'manifest-core-only.json')), schemaVersion: 0 };
    expect(parseManifest(payload, self).degraded).toBe(true);
  });

  it('never returns an empty apps array, whatever it is given', () => {
    for (const payload of [null, undefined, 42, [], {}, { schemaVersion: 1 }, { schemaVersion: 1, source: 'core', apps: [] }]) {
      const parsed = parseManifest(payload, self);
      expect(parsed.manifest.apps.length).toBeGreaterThan(0);
    }
  });
});

describe('parseManifest keeps what it can and says what it dropped', () => {
  const self = { self: 'core', selfName: 'Core' } as const;
  const base = () => readJson(resolve(examplesDir, 'manifest-full-landscape.json'));

  it('ignores unknown fields so version 1 can grow additively', () => {
    const payload = base();
    payload.somethingAddedLater = { deeply: ['nested'] };
    payload.apps[0].tagline = 'new in a later minor';
    const parsed = parseManifest(payload, self);
    expect(parsed.degraded).toBe(false);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.manifest.apps[0]).not.toHaveProperty('tagline');
  });

  it('renders an app key it has never heard of (NAV-19)', () => {
    // The whole point of opening the set: a sixth app reaches the rail through
    // the environment's configuration, without a release of this package. The
    // icon falls back to `GenericAppIcon`, because `SuiteNav` keys its icon map
    // on the entry's own `icon` field rather than on this value.
    const payload = base();
    payload.apps.push({ key: 'warehouse', name: 'Warehouse', icon: 'warehouse', url: 'http://wh.example', order: 60 });
    const parsed = parseManifest(payload, self);
    expect(parsed.degraded).toBe(false);
    expect(parsed.manifest.apps.map((a) => a.key)).toContain('warehouse');
    expect(parsed.warnings).toEqual([]);
  });

  it('still drops a malformed app key, and says so', () => {
    const payload = base();
    payload.apps.push({ key: 'Ware House', name: 'Warehouse', icon: 'warehouse', url: 'http://wh.example', order: 60 });
    const parsed = parseManifest(payload, self);
    expect(parsed.degraded).toBe(false);
    expect(parsed.manifest.apps.map((a) => a.key)).not.toContain('Ware House');
    expect(parsed.warnings.join(' ')).toContain('malformed');
  });

  it('renders an unknown nav group as an ordinary item and warns', () => {
    const payload = base();
    payload.apps[1].nav[0].group = 'operations';
    const parsed = parseManifest(payload, self);
    expect(parsed.manifest.apps.find((a) => a.key === 'cockpit')?.nav?.[0].group).toBeNull();
    expect(parsed.warnings.join(' ')).toContain('operations');
  });

  it('drops suite links when Core is not in the landscape', () => {
    const payload = base();
    payload.apps = payload.apps.filter((a: { key: string }) => a.key !== 'core');
    payload.self = 'downtimes';
    const parsed = parseManifest(payload, { self: 'downtimes', selfName: 'Downtimes' });
    expect(parsed.manifest.suite).toBeUndefined();
    expect(parsed.warnings.join(' ')).toContain('no Core app');
  });

  it('keeps stale as a signal for logs, not a different rendering', () => {
    const parsed = parseManifest({ ...base(), stale: true }, self);
    expect(parsed.manifest.stale).toBe(true);
    expect(parsed.manifest.source).toBe('core');
    expect(suiteSourceAttribute(parsed.manifest)).toBe('core');
  });

  it('strips a trailing slash from an app url so joining a path cannot double it', () => {
    const payload = base();
    payload.apps[0].url = 'http://core.example/';
    const parsed = parseManifest(payload, self);
    expect(parsed.manifest.apps[0].url).toBe('http://core.example');
  });
});

describe('ordering and the self-only helper', () => {
  it('sorts by order, then by key, so the rail is stable', () => {
    const apps = [
      { key: 'lists', name: 'L', icon: 'lists', url: 'http://l', order: 20 },
      { key: 'core', name: 'C', icon: 'core', url: 'http://c', order: 10 },
      { key: 'downtimes', name: 'D', icon: 'downtimes', url: 'http://d', order: 20 },
    ] as const;
    expect(sortApps([...apps]).map((a) => a.key)).toEqual(['core', 'downtimes', 'lists']);
  });

  it('produces the same shape a relay serves when Core has never answered', () => {
    const m = selfOnlyManifest({ self: 'lists', selfName: 'Lists', selfUrl: 'http://lists.example/' });
    expect(validate(m)).toBe(true);
    expect(m.source).toBe('fallback');
    expect(m.suite).toBeUndefined();
    expect(m.apps[0].url).toBe('http://lists.example');
  });
});
