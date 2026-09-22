# The suite manifest

The contract that tells a Mantsu frontend which apps exist in this landscape, where they
live, and what to put in the navigation rail.

Version 1. Normative for `mantsu-core`, `mantsu-order-cockpit`, `mantsu-downtimes` and
`mantsu-lists`. This document, `suite-manifest.schema.json` and
`../src/components/SuiteNav/manifest.ts` are one artefact in three forms; a test asserts
the examples below satisfy both the schema and the parser. Do not restate the schema in
another repo: NAV-5 and NAV-6 link here.

Background and the decision to serve the landscape from a backend rather than bake it into
a frontend image: ClickUp NAV-1.

## Why this document exists

The manifest crosses six boundaries: Core produces it, three backends relay it, and four
frontends consume it. Nothing in that chain fails loudly on a field that quietly changed
meaning. A frontend that receives an unfamiliar payload has exactly one honest behaviour,
and it is not "render nothing": an operator who opens Downtimes must reach Downtimes even
when the rest of the suite is unreachable. So the rules below are as much about degrading
as about the happy path.

## Endpoint

```
GET /api/v1/suite/manifest
```

Served by **every** backend, behind that app's BFF, so the frontend calls it same-origin
through the `/api` proxy it already uses. Same session requirement as any other `/api/*`
route: the manifest carries no secrets and no user data, but there is no reason to publish
the internal landscape anonymously.

| | |
|---|---|
| Response | `application/json`, a manifest object |
| Caching | `Cache-Control: max-age=300` |
| Status | `200` always, including when Core could not be reached (see [Fallback](#fallback)) |

A relay backend that cannot reach Core does **not** return `502`. It returns a valid
manifest describing itself, because a reachable app with a small rail is the correct
outcome, and an error status would make the frontend choose between a broken page and its
own hardcoded landscape.

## Source of truth

**Core.** `config.suite.apps` in Core's Helm values lists the installed apps per
environment. Core serves that as the manifest. Cockpit, Downtimes and Lists fetch it from
`CORE_BASE_URL` in-cluster, cache it, and relay it to their own frontend with `self` set to
themselves.

An app installed without Core is a supported configuration, not an error: it serves a
manifest containing only itself.

## Schema, version 1

```json
{
  "schemaVersion": 1,
  "self": "downtimes",
  "source": "core",
  "suite": {
    "dashboardUrl": "http://core.10.10.10.4.nip.io/",
    "settingsUrl": "http://core.10.10.10.4.nip.io/settings/suite"
  },
  "apps": [
    {
      "key": "core",
      "name": "Core",
      "icon": "core",
      "url": "http://core.10.10.10.4.nip.io",
      "order": 10,
      "nav": [
        { "key": "locations", "label": { "en": "Locations", "nl": "Locaties" }, "path": "/location", "group": null }
      ]
    }
  ]
}
```

### Top level

| Field | Type | Required | Meaning |
|---|---|---|---|
| `schemaVersion` | integer ≥ 1 | yes | Major version of this contract. See [Versioning](#versioning). |
| `self` | app key | yes | Which app served this response. Always present in `apps`. |
| `source` | `"core"` \| `"fallback"` | yes | Where the landscape came from. See [Fallback](#fallback). |
| `stale` | boolean | no | `true` when a relay is serving a cached copy because Core is currently unreachable. Absent means fresh. |
| `suite` | object | no | Suite-wide links. Absent when Core is not in `apps`. |
| `apps` | array, min 1 | yes | The landscape, including `self`. |

### `suite`

| Field | Type | Required | Meaning |
|---|---|---|---|
| `dashboardUrl` | absolute URL | yes | Target of the rail's top-level *Dashboard* row and of the logo. |
| `settingsUrl` | absolute URL | yes | Target of the *Suite* scope on a Settings page that is not Core's. |

`suite` is present exactly when `core` is in `apps`. Both live in Core, so a landscape
without Core has neither a suite dashboard nor a suite settings scope, and the rail omits
both rows rather than linking somewhere that does not exist.

### `apps[]`

| Field | Type | Required | Meaning |
|---|---|---|---|
| `key` | slug, `^[a-z][a-z0-9-]{1,31}$` | yes | Stable identity. Equal to the `appKey` Core publishes in the role catalogue (`assignments[].app`), so a rail row and a role assignment cannot disagree about what an app is called. Shipped today: `core`, `cockpit`, `downtimes`, `lists`, `reporting`. |
| `name` | string | yes | Display name, as configured. Not translated: these are product names. |
| `icon` | string | yes | An icon *key*, never markup. The consumer maps it to a component; see [Icons](#icons). |
| `url` | absolute URL, no trailing slash | yes | The app's public origin in this environment. |
| `order` | integer | yes | Rail order, ascending. Configured, not derived, so an environment can order its own landscape. Ties break on `key`. |
| `nav` | array | no | The app's own rail items. Phase 2; see [Nav entries](#nav-entries). |

**The key set is open (NAV-19).** Any lowercase slug matching
`^[a-z][a-z0-9-]{1,31}$` is valid, so adding a sixth app is a configuration change in the
environment's Helm values and neither a schema change nor a release of this package. The
five keys in the table are the ones the suite ships today; the type offers them to
autocomplete and does not restrict the value.

It used to be closed, on the grounds that every consumer keyed an icon map and a settings
scope list off it. Neither held: `SuiteNav` resolves an icon from the entry's own `icon`
field and falls back to `GenericAppIcon` for one it does not recognise, and
`APPS_WITHOUT_SETTINGS` is an exclusion list, so an app that is not on it gets a settings
scope by default. An unknown app therefore renders correctly today.

A **malformed** key is still dropped with a warning: this value reaches URLs, `data-`
attributes and a role-catalogue lookup, so anything needing escaping does not belong here.

### Nav entries

`nav` is optional and arrives in phase 2. Until then the rail shows other apps as a single
row that links to their origin, and only `self` shows sub-items, taken from the app's own
route registry as it does today.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `key` | string | yes | Stable per app; unique within that app's `nav`. |
| `label` | `{ en, nl }` | yes | Both languages, always. The rail has no fallback language. |
| `path` | string starting `/` | yes | Path within that app, appended to the app's `url`. |
| `group` | `"configuration"` \| `null` | yes | `"configuration"` renders under the inert *Configuration* subtitle. `null` is an ordinary sub-item. |

`group` is explicit rather than optional so that "ordinary item" is a stated fact and not
the absence of one; a producer that forgets the field fails validation instead of silently
moving an item out of Configuration.

Any other `group` value is ignored: the entry renders as an ordinary sub-item and the
consumer logs a warning. Adding a group means adding it to this document first, then to
the schema and the parser, and only then to a producer.

Items are rendered in array order. Ordinary items come before the *Configuration* block
regardless of their position in the array, matching the design.

### Publishing `nav`: `GET /api/v1/suite/nav`

Phase 2. Every app serves its own navigation at this path, and Core fetches each one
in-cluster at `{app.backendUrl}` once per its own cache window, then folds the answers
into the manifest. Core's own `nav` comes from its route contract in-process; it does not
call itself.

```json
{ "nav": [ { "key": "...", "label": { "en": "...", "nl": "..." }, "path": "/...", "group": null } ] }
```

**Who may read it.** A signed-in user, or a verified S2S caller. Core's aggregator is
neither a user nor, without a credential, a verified anything, so the S2S half is what
makes aggregation work at all.

Leaving the route open in-cluster was tried and rejected: Order cockpit's
`assert_all_routes_declared` refuses to start an app with an unauthenticated route under
`/api/`, deliberately, and that rule is worth more than the convenience of not configuring
a key. So Core authenticates.

**One key, three scopes.** Core holds one outbound key (`SUITE_S2S_KEY_NAME` /
`SUITE_S2S_SECRET`) that has to exist in every app's own inbound `MCP_S2S_KEYS` with the
same secret. NAV-11 registers it. Three secrets in Core's values would be three things to
rotate for no additional separation.

The **scope** is per app, though, because each app derives what it requires from the
request path under its own prefix:

| App | Scope Core must present |
|---|---|
| Order cockpit | `ordercockpit:suite:read` |
| Downtimes | `downtimes:suite:read` |
| Lists | `lists:suite:read` |

The prefix is the app's own name for itself, not its suite key: Order cockpit calls itself
`ordercockpit`. Getting this wrong is a **403**, not a 401, which reads like a key problem
and is not one.

**Failure is ordinary.** An app that times out, 404s, answers malformed JSON, or rejects
the credential contributes no `nav` and keeps its row in `apps`. Core's manifest is never
held up by a neighbour, and a landscape with no suite key configured simply degrades to
phase 1. The same tolerance is why enabling aggregation cannot take a rail down.

**What is not published.** No capability or role information. An app's navigation goes out
unfiltered and the target app enforces access when someone follows a link (NAV-1, *Risks*).
Filtering here would mean Core knowing every app's authorization model.

**What each app leaves out of its own `nav`:** its settings page, in every app, because the
rail reaches settings through its pinned row and the scope column. Core additionally leaves
out `dashboard` (it is the suite-wide top-level row, linked from `suite.dashboardUrl`, and
publishing it twice would put it in the rail twice) and `userManagement` (the design moves
Users into Settings › Suite › Users & access). Order cockpit leaves out `serviceStatus`,
per the founder decision at the review of NAV-1, open point 2.

### Where `nav` labels come from

**Decision, Dider, 2026-09-12, at the review of NAV-4.** `routeContract.json` is extended
with a label per route. It was raised because NAV-1 assumed the contract already carried
what `nav` needs; it does not. Cockpit's and Downtimes' `routeContract.json` carry
`moduleKey`, `path`, `group`, `order` and `requiresCapability`, and **no labels** at all:
those live in the frontends' i18n resources, which a backend does not read.

The alternative, a label map held in each backend, was rejected. `routeContract.json` is
already the mirror that a route change has to update, and a unit test already fails when it
and the route registry disagree, so a forgotten label turns red in a tier that runs in CI.
A second map in the backend is a second place that can drift in silence, and drift is the
thing this contract exists to make impossible.

What that means concretely, normative for NAV-6:

- Every entry in `routeContract.json` gains `label: { en, nl }`, required, both languages.
  The existing mirroring test extends to cover it, so a route added without labels fails
  the frontend unit tier rather than shipping an unlabelled rail row.
- Cockpit and Downtimes extend the file they already have. Core and Lists generate one
  from `APP_ROUTES` first; that generation is part of NAV-6.
- `GET /api/v1/suite/nav` reads the contract and returns the `nav` array in this document's
  shape. `group` maps straight through for `configuration`; Cockpit's and Downtimes'
  existing `operations` group maps to `null`, since the design drops that heading.
- The route contract keeps `requiresCapability`, and the manifest keeps ignoring it. Nav
  entries of *other* apps are published unfiltered by design (NAV-1, *Risks*); the target
  app enforces access itself with `RequireCapability`.

Nothing here blocks phase 1: `nav` is absent from a phase 1 manifest.

**Done, 2026-09-13.** All four repos now carry `label: { en, nl }` on every route in their
`routeContract.json`, and a frontend unit test in each fails when the contract and the
route registry disagree, labels included. Core and Lists had no contract at all and now
generate one from `APP_ROUTES`. `path` in Lists' contract is `matchPrefixes[0]` rather than
`to`, because `to` there may be a function of the caller's roles and what another app's
rail links to must not depend on who asks.

The file travels to each backend through one `COPY` line in its Dockerfile rather than a
ConfigMap: a ConfigMap would put the navigation in the chart, where it drifts from the
routes it describes on the first release that forgets to update it.

### Icons

`icon` is a key the consumer resolves. Known keys and what they resolve to today:

| Key | Resolves to |
|---|---|
| `core` | Lucide `boxes`, a stand-in. Core has no module icon of its own yet (handoff, *Assets*). |
| `cockpit` | `mantsu-module-cockpit` |
| `downtimes` | `mantsu-module-downtimes` |
| `lists` | `mantsu-module-lists` |
| `reporting` | `mantsu-module-reporting` |

An unknown key renders the generic app glyph. It is not an error: an environment naming an
icon a consumer does not have yet should still show the row.

## Versioning

`schemaVersion` is a **major** version, and only a major version.

| Change | `schemaVersion` |
|---|---|
| Adding an optional field | unchanged |
| Adding a value to a closed enum (`icon` is open, `key` and `group` are closed) | unchanged; consumers already ignore what they do not know |
| Removing a field | increment |
| Renaming a field | increment |
| Narrowing a type, or making an optional field required | increment |
| Changing what an existing field means | increment |

Two rules make that work, and both are load-bearing:

1. **A consumer ignores fields it does not know.** Never validate for the absence of extra
   properties. The schema in this directory sets `additionalProperties: false` for *producer*
   validation, in a producer's own tests; a consumer must not use it that way.
2. **A consumer that receives a higher major than it supports does not fail.** It renders
   the rail with its own items only, exactly as in the fallback case, and logs a warning
   naming both versions. Never an empty menu, never a blank page, never a raw error to the
   operator.

A *lower* major than the consumer supports is the same case, treated the same way: the
consumer knows the payload's shape has changed underneath it and does not guess.

The reason this is stricter than it looks: the four frontends install
`@bemayker/mantsu-design-system` at their own pace, so at any moment two apps in one
landscape may hold different parser versions. Version skew is the normal state, not an
incident, and the manifest is the only place it can be detected.

## Fallback

`source` says where the landscape in this response came from.

| `source` | `stale` | Situation | `apps` |
|---|---|---|---|
| `core` | absent | Core answered, or this *is* Core | the configured landscape |
| `core` | `true` | Core is unreachable now; the relay is serving its last good copy | the last good landscape |
| `fallback` | absent | Core has never answered since this backend started, or is not installed | `self` only |

Relay behaviour, normative for NAV-6:

- Timeout on the call to Core: **2 seconds**.
- Cache TTL: **5 minutes**. A hit inside the TTL is served without calling Core.
- On timeout or error with a cached copy: serve it, add `stale: true`, keep `source: "core"`.
  Do not extend the TTL; retry on the next request after it expires.
- On timeout or error with no cached copy: serve `source: "fallback"` with `self` only, and
  omit `suite`.
- A malformed response from Core is an error, not a landscape. Same handling as a timeout.

Rail behaviour on `source: "fallback"`, normative for NAV-2 and NAV-7 to NAV-10:

- No *Dashboard* row: there is no `suite.dashboardUrl` to point it at.
- No other app rows: the frontend does not know that they exist, and inventing them from a
  build-time constant is the thing this contract exists to prevent.
- The app's own items render normally. The app is fully usable.
- The rail root carries `data-suite-source="fallback"`, so an E2E test can assert the
  degraded state instead of inferring it from a missing row.

`stale: true` changes nothing visually. It is for logs and for E2E, not for the operator:
a five-minute-old list of app URLs is not information anyone needs to act on.

## Examples

Three, in [`examples/`](examples/), each validated in CI against the schema and the parser.

| File | Case |
|---|---|
| [`manifest-full-landscape.json`](examples/manifest-full-landscape.json) | All five apps, served by Downtimes, with phase-2 `nav` |
| [`manifest-lists-standalone.json`](examples/manifest-lists-standalone.json) | Lists installed without Core: `source: "fallback"`, no `suite`, one app |
| [`manifest-core-only.json`](examples/manifest-core-only.json) | Core with no optional apps installed: `source: "core"`, `suite` present |

The middle one is the case worth reading twice. It is not an outage: it is a supported
installation, and it produces the same payload an outage produces. That is deliberate, so
neither the relay nor the rail needs to tell them apart.

## Consuming it

```ts
import { parseManifest } from '@bemayker/mantsu-design-system';

const parsed = parseManifest(await res.json(), { self: 'downtimes', selfName: 'Downtimes' });

parsed.warnings.forEach((w) => console.warn('[suite-manifest]', w));
// parsed.manifest is always renderable, degraded or not.
// parsed.degraded is true when the payload was rejected and the parser built a
// self-only manifest instead.
```

`parseManifest` never throws and never returns an empty `apps`. Everything the two rules in
[Versioning](#versioning) require is implemented there, so a consumer that calls it cannot
get the degrade path wrong by forgetting a branch.

## Producing it

For NAV-5 (Core) and NAV-6 (the three relays):

- Validate your output against `suite-manifest.schema.json` **in your own tests**, with
  `additionalProperties: false`. A producer emitting a field this document does not define
  is a bug; a consumer receiving one is not.
- Do not copy the schema into your repo. Vendor it if your test runner needs a local file,
  and record where it came from and at which commit, the way `VENDORING.md` describes.
- `url` has no trailing slash. `dashboardUrl` does. Both are asserted by the schema, so
  neither is a matter of taste at the join.
- Sort `apps` by `order` before serving. Consumers sort too, but a producer that emits an
  arbitrary order makes every response diff unstable and every fixture brittle.
