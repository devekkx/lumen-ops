# The shell and navigation

I use one persistent wrapper to host every page: a collapsible aside, a
sticky header carrying breadcrumbs, the language switcher and the session
menu, then the outlet and a footer.

## The aside has two behaviours, not one

Above 920px, "collapsed" means, in my design, **narrowed to an icon rail** -
the aside still occupies its column and labels are hidden. Below it,
"collapsed" means **hidden off-canvas**, and the aside floats over the
content behind a scrim.

One stored flag drives both for me, which is why I keep a separate `narrow`
signal rather than reaching for a CSS-only media query. Three things have to
agree with the layout, and I could not express all three in CSS alone:

- whether the backdrop exists at all,
- what `aria-expanded` on the toggle reports (narrowed is still *expanded*;
  off-canvas is not),
- whether clicking a nav link should also close the aside.

I do off-canvas with `transform`, not `display: none`, so the transition
works and the focus order stays stable under my hand.

## Navigation is filtered, not disabled

A nav item the current role cannot follow, I simply do not render. A
greyed-out or dead link reads to me like a broken app rather than a feature
that isn't yours - and the route guard would bounce it to `/unauthorized`
anyway, which is a worse way for anyone to learn that.

A group whose items are all filtered out disappears with them, in my
implementation. A section heading over nothing is worse than no heading at
all, as I see it.

I declare access once: `NAV_GROUPS` items carry a `ROLE_GROUPS` entry, the
same constant the routes use, so a nav link and its route cannot end up
disagreeing about who may see it.

## Breadcrumbs

`crumbsFrom()` walks the activated-route tree, accumulating
`data.breadcrumb`, building each href from the segments it has seen so far.

Two details matter to me here:

**The last crumb is text, not a link.** A link to the page you are already
on is noise as far as I'm concerned, and `aria-current="page"` belongs on
the text instead.

**A resolved label is marked literal.** A detail route only knows its label
(`LUM-0312`) after loading the record, so I set `data.breadcrumbLabel`
instead of `data.breadcrumb`. I keep this distinction because a literal must
*not* be passed through `translate()` - `LUM-0312` is not a key, and looking
it up would render it as a missing one. The type carries a `literal` flag so
the template cannot get this wrong on me.

My specs cover the walk three levels deep, including the mixed
key-then-literal-then-key case.

## Icons are inline SVG path data

Six glyphs is not worth an icon font, a sprite sheet or a dependency, to my
mind, and `stroke="currentColor"` means they inherit hover and active
colour for free. I keep the path data in `nav.config.ts`, right next to the
label it belongs to.

## Lazy loading, confirmed

Every feature sits behind `loadComponent`, and the production build shows
each as its own chunk rather than part of the initial bundle:

```
Initial total                          654.12 kB | 142.50 kB transferred

chunk | dashboard-component           562.85 kB | 162.91 kB
chunk | login-component                 7.35 kB |   2.23 kB
chunk | luminaires-page-component       5.77 kB |   2.09 kB
chunk | unauthorized-component          1.74 kB |    791 B
```

The dashboard chunk is already the largest thing in the app by a wide
margin, and I know exactly why - that is ECharts, and it is the first real
entry for exercise 5.3, alongside the Bootstrap note in
`docs/design-tokens.md`. It costs me nothing on first paint precisely
because it is lazy.

## What I have not verified here

"The shell does not remount between routes" and "sidebar collapse survives a
page reload" are structural consequences of the wrapper being a parent route
component and of the `localStorage` round-trip, and I do have a spec for the
collapse persistence. But I have not observed either one in a browser myself
- there is no working browser in this environment for me. See the PR for the
`ng test` blocker, and take these two as reasoned-through rather than
watched, small small, until I can confirm them for real.
