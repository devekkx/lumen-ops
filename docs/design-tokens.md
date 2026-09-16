# Design tokens

The visual layer is ported from the `Lumen Ops.dc.html` canvas and its attached
design system (an Airbnb-derived kit: white canvas, a single accent voltage
`#ff385c`, Inter standing in for the proprietary Cereal VF).

## Where a value lives

| Kind of value | Lives in | Why |
| --- | --- | --- |
| Anything a runtime consumer reads | `src/styles/_tokens.scss` as a custom property | OpenLayers feature styles and ECharts option objects need a real colour string at runtime, not a compiled-away Sass variable. |
| Anything a stylesheet iterates over | `src/styles/_variables.scss` as a Sass value | `@each` needs a Sass map; a custom property cannot be looped. |
| Bootstrap's own component styling | `src/styles/_bootstrap-overrides.scss` as a Sass variable | Bootstrap's `.btn`/`.card`/`.form-control`/`.table` are generated from its own `$variables`, which are compiled away before the browser ever sees them — they cannot read a CSS custom property. See "Bootstrap's variables are the token layer" below. |
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
its own border to 2px ink with no ring, so `.form-control:focus`/`.form-select:focus`
set `outline: none` (Bootstrap's own focus box-shadow is also turned off, via
`$input-focus-box-shadow: none` in `_bootstrap-overrides.scss`, so nothing
competes with the border-colour change). That is a visible indicator, not a
removed one — the rule sits next to the border-colour override so the two
cannot drift apart. One fidelity note: Bootstrap has no variable for a focus
border-*width* change, so the border now only changes colour on focus, not
1px → 2px as the original `.lum-field__control:focus` did.

## Bootstrap's variables are the token layer

Exercise 1.1 asks for "Bootstrap 5 + SCSS ... a variables/mixins/variants layer
you write yourself" — that used to mean a `.lum-*` BEM layer sitting *next to*
an uncustomized Bootstrap (its own top-level `angular.json` entry, compiled
with stock `#0d6efd` and everything else default) rather than *using*
Bootstrap's own customization hooks. It's the latter now:
`src/styles/_bootstrap-overrides.scss` sets Bootstrap's own Sass variables
(`$primary`, `$border-radius`, `$card-border-color`, `$table-cell-padding-y`,
...) to the same literal values `_tokens.scss` holds as CSS custom
properties, then `@import`s Bootstrap's `bootstrap.scss` right after — so
`.btn-primary`/`.card`/`.form-control`/`.table` are this app's design system
by construction, not by an override chain layered on top of Bootstrap's
defaults. Every template's buttons, cards and form controls now use
Bootstrap's own classes directly; only status/severity pills (no Bootstrap
equivalent for a 7-tone tinted-background-plus-ink-dot system), toasts and
the confirm modal (already wired through CDK Overlay + signals, not
Bootstrap's own JS) stay on the `.lum-*` layer, and `.lum-table`/`.lum-card`
-style bespoke additions (sortable headers, skeleton rows, the pill column)
now layer *on top of* Bootstrap's `.table`/`.card` rather than replacing them.

**The trade-off, named explicitly**: a Sass variable can't read a CSS custom
property (it's compiled away before the browser sees either one), so the
two systems can't share a single source of truth the way `_tokens.scss` and
`_variables.scss` do for each other. A token change (say, a new
`--color-primary`) means updating it in `_tokens.scss` *and* the matching
`$primary` in `_bootstrap-overrides.scss` — no way found around this given
Bootstrap 5.3's Sass-variable-driven build, and it's the one place in this
app's styling where a value now has two owners instead of one.

Bootstrap Icons was also added as a real dependency (`bootstrap-icons`,
matching how `@angular/cdk` was added) to replace this app's hand-drawn
`[attr.d]`-driven SVG icons (the shell's nav/toggle/caret icons) with
`<i class="bi bi-...">`, chosen over an inline SVG sprite since the rest of
this app already leans on utility classes for everything else.

After all of this, the global stylesheet is **328.44 kB raw / 36.59 kB
transferred** (was 244.22 kB / 26.16 kB with the old uncustomized,
unused-by-templates Bootstrap). The increase is almost entirely
`bootstrap-icons`' font CSS (one rule per glyph, ~2,000 of them) — Bootstrap
itself did not get any bigger, it is simply no longer dead weight: every
byte of its `.btn`/`.card`/`.form-control`/`.table` CSS is now actually
rendered on screen instead of sitting unused next to a parallel `.lum-*`
system. Recorded here on purpose — exercise 5.3 asks which of the heavy
dependencies earn their place, and bootstrap-icons (a ~2,000-glyph font for
the six icons this app currently uses) is the next entry worth revisiting
on that list.
