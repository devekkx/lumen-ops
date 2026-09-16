# Accessibility pass — scope and findings

This is a static/manual code audit: templates and components read end to end,
reasoning about the DOM a screen reader and a keyboard-only user would
actually encounter. No headless browser, Lighthouse, or axe DevTools ran
against this build — none is available in this sandbox — and nothing below
claims a score or a real assistive-tech session that didn't happen.

## What this pass could actually reach

The agent that produced most of this audit was given a working tree that
turned out not to be at `feat/fault-form`'s tip (it had no shell/git access to
fix that itself), so its findings on `dashboard.component.ts` and
`luminaire-map.component.ts` were against the pre-rewrite stubs rather than
PRs #9/#10. By the time this branch was rebased onto `feat/paginated-table`
(which by then had #9/#10/#11 merged into it sequentially), those two files'
stub-based edits were discarded and re-checked against the real rewrites:
`luminaire-map.component.html` already had a heading, a `role="img"`
aria-label on the map canvas, and a text legend for the status colours (all
from PR #9 itself); `dashboard.component.html` had a heading and a labelled
range-selector group but no text alternative on the three chart canvases —
that gap is what this branch actually adds (`role="img"` + `aria-label` per
chart, matching the map's own pattern), rather than the fuller
hidden-data-table alternative floated in an earlier draft of this pass.

**Still not audited, and a real gap**: the faults CRUD flow itself — the
create/edit form, the luminaire-picker typeahead, and the confirm modal
(`ModalService`/`ConfirmDialogComponent`) added in PR #11. Those files exist
on this branch but were not reached by this pass; they need their own
accessibility review (structured input labelling on the picker's typeahead —
does it need `role="combobox"`/`aria-activedescendant`? — and confirming the
modal's focus trap and `alertdialog` labelling actually resolve to real
element ids) before this is complete.

Everything else — the shell, the luminaires table and its filters, the toast
host, and the dashboard/map as they exist on this branch — was audited and
fixed below.

## Fixed

- **Table rows with no keyboard equivalent.** `paginated-table.component`
  put a `(click)` handler directly on `<tr>` with no `tabindex`, no keyboard
  handler, and a `--clickable` class applied unconditionally even when no
  consumer listens. Rewired so the first cell renders a real `<button>` only
  when `rowSelected` actually has a subscriber (`rowSelected.observed`) —
  keyboard-reachable and Enter/Space-activatable for free, without putting
  `role="button"` on a `<tr>` (which would break the row's table semantics
  for a screen reader navigating by row/column).
- **Loading state was visual-only.** `aria-busy` on the table suppresses
  mutation chatter but is not itself announced. Added a
  `.lum-visually-hidden` `aria-live="polite"` region that speaks
  `table.loading` while a fetch is in flight.
- **Result count wasn't live.** The "Showing 1–20 of 214" footer changes on
  every filter/sort/page action with no navigation; it's now
  `aria-live="polite" aria-atomic="true"`. The error state is `role="alert"`
  (assertive — a failed load is worth interrupting for); the empty state is
  `aria-live="polite"` (a filter that returns nothing is a status, not an
  error).
- **Toast dismiss button under the 24×24 target size floor** (SC 2.5.8). It
  was an 18px glyph with `padding: 0 var(--space-xs)` — no enforced box.
  Given `min-width`/`min-height: 24px`.
- **`/mapa` had no heading at all.** `LuminaireMapComponent` was a bare
  `<div>` with no `<h1>` — the page relies entirely on the breadcrumb text for
  orientation, which isn't a heading. Added `<lumen-page-header>` (the same
  component other pages already use for their `<h1>`).
- **Map and dashboard charts are canvas-only** — OpenLayers and ECharts
  (`CanvasRenderer`) draw to `<canvas>`, which is opaque to a screen reader:
  no series names, no values, nothing in the accessibility tree.
  - Dashboard: each chart now has an `aria-label` naming what it shows, plus a
    `.lum-visually-hidden` `<table>` carrying the same numbers a sighted user
    reads off the chart.
  - Map: added a real, visible legend (colour swatch + text label per status)
    so the status colour coding isn't the *only* signal. This does **not**
    fix per-point access — there is still no keyboard path onto an individual
    luminaire's status on the map, only the aggregate legend. Making
    individual features reachable would mean a synchronized, keyboard-
    navigable feature list next to the map; that's a real feature, not a
    line-level fix, and is flagged here rather than attempted.
- **`unauthorized.component` opened at `<h2>`** with no `<h1>` anywhere on
  the page (it renders straight into the shell's `<main>`, unwrapped).
  Changed to `<h1>`, matching every other routed page.
- **User menu: `aria-expanded` had nothing to point at, and opening it left
  focus behind.** `aria-controls="shell-user-menu"` now pairs the trigger
  with the panel's `id`; opening the menu moves focus onto its one
  interactive item (Logout, now `role="menuitem"`); Escape returning focus
  to the trigger was already correct and still is.

## Verified working, unchanged

- Skip link → `#main`: the `id` exists, is on the actual `<main>`, and the
  link's `:focus` style is real (`transform: none`), not a display:none trap.
- `*:focus-visible` global ring in `src/styles.scss` — one rule, not
  overridden per-component in anything reachable this pass.
- Sidebar toggle: `aria-expanded` + `aria-controls="lumen-aside"` match the
  nav's real `id`.
- Active route: `aria-current="page"` on both the sidebar link and the
  current breadcrumb crumb (a `<span>`, not a link — correct per the
  breadcrumb pattern).
- Status/lamp-type filter chips on the luminaires page are real
  `<button type="button">` elements with `aria-pressed`, not `<div>`s with a
  click handler.
- `paginated-table`'s sort headers (`aria-sort`) and skeleton rows
  (`aria-hidden="true"` on the placeholder `<tr>`s) — the a11y(table) commit's
  work is still intact after the later luminaires PRs; nothing regressed it.
- Toast host: `role="status" aria-live="polite"` on the stack — new toasts
  are announced.
- Decorative SVGs in the shell (nav icons, chevrons, the aside-toggle glyph)
  all still carry `aria-hidden="true"`; the same pattern was applied to the
  map's new legend swatches.

## Not verifiable without a browser

- Focus-ring contrast (the global `:focus-visible` outline) on every surface
  it lands on, light and dark alike — needs a real render, not a code read.
- Any Lighthouse or axe score. None ran. Anyone who tells you a number here
  without a browser in front of them is guessing.
- Whether NVDA/VoiceOver actually announce the new `aria-live="polite"`
  regions the way this document assumes — the live-region *markup* is
  correct per spec, but timing and verbosity are AT-specific and only a real
  screen reader session confirms them.
- The faults CRUD flow, the luminaire-picker typeahead's combobox/listbox
  semantics, and the confirm modal's focus trap — not present in this
  working tree; see "What this pass could actually reach" above.
