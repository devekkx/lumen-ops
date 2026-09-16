# TypeScript configuration notes

I have deliberately kept `strict: false` while `strictTemplates: true` on
this workspace, and the brief is right that this combination catches people
out - it certainly caught me the first time I read it. `strict: false`
permits the loose, legacy-style TypeScript I would otherwise have to fight
during a migration exercise: a variable can sit implicitly `any`, a value
can be `null` or `undefined` without the compiler making me prove otherwise,
and an assignment between two not-quite-matching shapes goes through without
a fight. In plain terms, the `.ts` files themselves are on the honour
system.

`strictTemplates: true` is the half that is not on the honour system.
Angular's own compiler still fully type-checks every binding in every
`.html` file against the component class that owns it - a typo'd property
name in `{{ luminaire.staus }}`, a method called with the wrong argument
count, a pipe fed the wrong input type, all of these still fail the build
even though the surrounding TypeScript is loose. That is precisely why I
kept it on: templates are where data actually reaches the user's eyes, so
that is the one place I was not willing to relax anything, even while the
rest of the workspace stays forgiving. My planned migration is to turn on
`strictNullChecks` first, resolve the resulting model boundaries myself, and
only then enable the remaining strict options - small small, not all at
once.
