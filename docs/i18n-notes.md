# Translation and locale

I have two locales, `es` and `en`, with **Spanish as both default and
fallback**. I took the copy from the canvas prototype's dictionary, so this
app's Spanish is the design's Spanish rather than something machine-
translated after the fact.

## Why I landed this before the screens

The canvas references a translation key at essentially every visible string.
If I had built six screens against hardcoded English and translated
afterwards, I would have ended up with Spanish sitting in templates - which
is exactly what the real repo did, and why `placeholder`, `title` and `alt`
are where its untranslated text still hides. By establishing the loader
first, no screen in a later PR has an English string for me to retrofit.

## Layout

| Path | Loaded |
| --- | --- |
| `public/i18n/{es,en}.json` | with the shell - 244 keys |
| `public/i18n/map/{es,en}.json` | when the map feature first renders |
| `public/i18n/docs/{es,en}.json` | when the docs feature first renders |

`TranslocoHttpLoader` serves both shapes from one method: Transloco asks for
`es` or for `map/es`, and `/i18n/{path}.json` resolves either. I don't need
to register a scope in the loader for any of it.

## One owner for the language

`LanguageService` is the only thing in this app that calls
`TranslocoService.setActiveLang` or touches `localStorage` for the language.
The Accept-Language interceptor, the header switcher and the three `Intl`
pipes all read its `current` signal instead.

That is deliberate on my part, and it is the exercise's whole point: the
real repo reads `localStorage` directly in eleven files, and, as I see it, a
language living in eleven places is a language that will drift out of sync
with the header that claims to set it. One owner, small small, keeps
everybody honest.

Every storage access I wrapped in `try`/`catch`. A private window throws on
access rather than returning `null`, and an app that cannot *remember* a
language should still *start* in one.

## `@LoadTranslations`

`load-translations.decorator.ts` is my class-decorator form of the real
repo's pattern. It appends a `TRANSLOCO_SCOPE` provider to the component's
own definition, so the scope declaration sits right next to the component
that owns it - hard for me to forget when a feature moves, unlike a
`providers` entry three files away.

## Formatting goes through the locale too

`lumenNumber`, `lumenDate` and `lumenCurrency` read `intlLocale()` rather
than taking a locale argument, so switching language re-formats numbers,
dates and euro amounts along with the copy. I made them **impure on
purpose**: the locale is a signal, and a pure pipe would freeze the first
render's formatting forever, which is not what I want.

`lumenDate` renders `-` for null and for an unparseable string, because
`Invalid Date` sitting in a table cell is worse than an obvious blank, to my
mind.

## Drift check

```
npm run check-i18n
```

This reports keys present in one locale and missing from the other, plus
empty values, per bundle - scopes included, since a missing key in a
lazily-loaded scope only surfaces to me when someone actually opens that
feature.

I verified it both ways. Clean:

```
root: es 244 · en 244
docs: es 2 · en 2
map: es 1 · en 1

i18n OK - every bundle matches across locales, no empty values.
```

Then with `table.retry` deleted from `en.json` and `table.clear` blanked:

```
2 findings:
  [root] table.retry - missing in en
  [root] table.clear - empty in en
```

…and exit code 1. I kept it CommonJS rather than ESM so it can keep the
filename the brief asks for without Node reparsing and warning on every run.
