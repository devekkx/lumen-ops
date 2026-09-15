# The shell and navigation

One persistent wrapper hosts every page: a collapsible aside, a sticky header
carrying breadcrumbs, the language switcher and the session menu, then the
outlet and a footer.

## The aside has two behaviours, not one

Above 920px, "collapsed" means **narrowed to an icon rail** — the aside still
occupies its column and labels are hidden. Below it, "collapsed" means
**hidden off-canvas**, and the aside floats over the content behind a scrim.

One stored flag drives both, which is why there is a separate `narrow` signal
rather than a CSS-only media query. Three things have to agree with the layout
and cannot be expressed in CSS alone:

- whether the backdrop exists at all,
- what `aria-expanded` on the toggle reports (narrowed is still *expanded*;
  off-canvas is not),
- whether clicking a nav link should also close the aside.

Off-canvas is done with `transform`, not `display: none`, so the transition
works and the focus order stays stable.

## Navigation is filtered, not disabled

A nav item the current role cannot follow is not rendered. A greyed-out or
dead link reads as a broken app rather than as a feature that is not yours —
and the route guard would bounce it to `/unauthorized` anyway, which is a worse
way to learn.

A group whose items are all filtered out disappears with them. A section
heading over nothing is worse than no heading.

Access is declared once: `NAV_GROUPS` items carry a `ROLE_GROUPS` entry, the
same constant the routes use, so a nav link and its route cannot disagree about
who may see it.

## Breadcrumbs

`crumbsFrom()` walks the activated-route tree accumulating `data.breadcrumb`,
building each href from the segments seen so far.

Two details that matter:

**The last crumb is text, not a link.** A link to the page you are already on
is noise, and `aria-current="page"` belongs on the text.

**A resolved label is marked literal.** A detail route knows its label
(`LUM-0312`) only after loading the record, so it sets `data.breadcrumbLabel`
instead of `data.breadcrumb`. The distinction exists because a literal must
*not* be passed through `translate()` — `LUM-0312` is not a key, and looking it
up renders it as a missing one. The type carries a `literal` flag so the
template cannot get this wrong.

Specs cover the walk three levels deep, including the mixed
key-then-literal-then-key case.

## Icons are inline SVG path data

Six glyphs is not worth an icon font, a sprite sheet or a dependency, and
`stroke="currentColor"` means they inherit hover and active colour for free.
The path data lives in `nav.config.ts` next to the label it belongs to.

## Lazy loading, confirmed

Every feature is behind `loadComponent`, and the production build shows each as
its own chunk rather than part of the initial bundle:

```
Initial total                          654.12 kB | 142.50 kB transferred

chunk | dashboard-component           562.85 kB | 162.91 kB
chunk | login-component                 7.35 kB |   2.23 kB
chunk | luminaires-page-component       5.77 kB |   2.09 kB
chunk | unauthorized-component          1.74 kB |    791 B
```

The dashboard chunk is already the largest thing in the app by a wide margin —
that is ECharts, and it is the first real entry for exercise 5.3 alongside the
Bootstrap note in `docs/design-tokens.md`. It costs nothing on first paint
precisely because it is lazy.

## What is not verified here

"The shell does not remount between routes" and "sidebar collapse survives a
page reload" are structural consequences of the wrapper being a parent route
component and of the `localStorage` round-trip, and the collapse persistence
has a spec. But neither has been observed in a browser — there is no working
browser in this environment. See the PR for the `ng test` blocker.
