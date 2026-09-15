# Design tokens

The visual layer is ported from the `Lumen Ops.dc.html` canvas and its attached
design system (an Airbnb-derived kit: white canvas, a single accent voltage
`#ff385c`, Inter standing in for the proprietary Cereal VF).

## Where a value lives

| Kind of value | Lives in | Why |
| --- | --- | --- |
| Anything a runtime consumer reads | `src/styles/_tokens.scss` as a custom property | OpenLayers feature styles and ECharts option objects need a real colour string at runtime, not a compiled-away Sass variable. |
| Anything a stylesheet iterates over | `src/styles/_variables.scss` as a Sass value | `@each` needs a Sass map; a custom property cannot be looped. |
| The domain vocabulary | `@shared/models/status-tone.ts` | A status is not a colour. It resolves *to* a tone, and only the tone owns a hex. |

## The status map

`$status-variants` holds seven tones and **one hex each** — nothing repeated:

| Tone | Ink | Used by |
| --- | --- | --- |
| `healthy` | `#1f6f5c` | OK, CLOSED, DONE, LED |
| `critical` | `#c13515` | FAULT, HIGH |
| `deep` | `#8c1f0b` | CRITICAL, ADMIN |
| `attention` | `#9a5b00` | MAINTENANCE, IN_PROGRESS, SODIUM, CONTRACTOR |
| `queued` | `#2f5fa8` | VALIDATED, ASSIGNED, MEDIUM, METAL_HALIDE, COUNCIL |
| `neutral` | `#6a6a6a` | OFFLINE, REJECTED, DRAFT, LOW, VIEWER |
| `brand` | `#ff385c` | REPORTED |

`status-variants` emits each tone twice — once as a
`--tone-<name>-ink` / `--tone-<name>-tint` custom-property pair, once as a
`.lum-pill--<name>` class. The tint is derived from the ink at 10% rather than
picked by hand, so a tone can only ever be changed in one place. That pairing
is what lets exercise 5.1 style map points and exercise 5.2 colour chart series
from the same source as the table's pills.

Twenty-three domain values map onto those seven tones. Generating a class per
value would have meant repeating hexes 23 times; `toneFor()` does the mapping
instead, and the stylesheet only ever sees a tone.

## Focus

One global treatment (`2px solid var(--color-ink)`, 2px offset). The text field
is the single deliberate exception: the design expresses its focus by thickening
its own border to 2px ink with no ring, so `.lum-field__control:focus` sets
`outline: none`. That is a visible indicator, not a removed one — the rule sits
next to the border change so the two cannot drift apart.

## Bootstrap is still loaded, for now

Exercise 1.1 mandates Bootstrap 5 as the UI base and the real repo uses it, so
`angular.json` still loads `bootstrap.scss` and the Lumen layer sits on top of
it. That is honest but not free: after this change the global stylesheet is
**244.22 kB raw / 26.16 kB transferred**, and almost all of it is Bootstrap that
the canvas design does not use.

Recorded here on purpose. Exercise 5.3 asks which of the heavy dependencies earn
their place, and this is the first entry on that list.
