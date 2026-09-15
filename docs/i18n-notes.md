# Translation and locale

Two locales, `es` and `en`, with **Spanish as both default and fallback**. The
copy is taken from the canvas prototype's dictionary, so the app's Spanish is
the design's Spanish rather than something machine-translated after the fact.

## Why this landed before the screens

The canvas references a translation key at essentially every visible string.
Building six screens against hardcoded English and translating afterwards is how
you end up with Spanish sitting in templates — which is exactly what the real
repo did, and why `placeholder`, `title` and `alt` are where its untranslated
text still hides. Establishing the loader first means no screen in a later PR
has an English string to retrofit.

## Layout

| Path | Loaded |
| --- | --- |
| `public/i18n/{es,en}.json` | with the shell — 237 keys |
| `public/i18n/map/{es,en}.json` | when the map feature first renders |
| `public/i18n/docs/{es,en}.json` | when the docs feature first renders |

`TranslocoHttpLoader` serves both shapes from one method: Transloco asks for
`es` or for `map/es`, and `/i18n/{path}.json` resolves either. No scope needs
registering in the loader.

## One owner for the language

`LanguageService` is the only thing in the app that calls
`TranslocoService.setActiveLang` or touches `localStorage` for the language.
The Accept-Language interceptor, the header switcher and the three `Intl`
pipes all read its `current` signal.

That is deliberate, and it is the exercise's point: the real repo reads
`localStorage` directly in eleven files, and a language living in eleven places
is a language that drifts out of sync with the header that claims to set it.

Every storage access is wrapped in `try`/`catch`. A private window throws on
access rather than returning `null`, and an app that cannot *remember* a
language should still *start* in one.

## `@LoadTranslations`

`load-translations.decorator.ts` is the class-decorator form the real repo uses.
It appends a `TRANSLOCO_SCOPE` provider to the component's own definition, so
the scope declaration sits next to the component that owns it — hard to forget
when a feature moves, unlike a `providers` entry three files away.

## Formatting goes through the locale too

`lumenNumber`, `lumenDate` and `lumenCurrency` read `intlLocale()` rather than
taking a locale argument, so switching language re-formats numbers, dates and
euro amounts along with the copy. They are **impure on purpose**: the locale is
a signal, and a pure pipe would freeze the first render's formatting forever.

`lumenDate` renders `—` for null and for an unparseable string, because
`Invalid Date` in a table cell is worse than an obvious blank.

## Drift check

```
npm run check-i18n
```

Reports keys present in one locale and missing from the other, plus empty
values, per bundle — scopes included, since a missing key in a lazily-loaded
scope only surfaces when someone opens that feature.

Verified both ways. Clean:

```
root: es 237 · en 237
docs: es 2 · en 2
map: es 1 · en 1

i18n OK — every bundle matches across locales, no empty values.
```

Then with `table.retry` deleted from `en.json` and `table.clear` blanked:

```
2 findings:
  [root] table.retry — missing in en
  [root] table.clear — empty in en
```

…and exit code 1. It is CommonJS rather than ESM so that it can keep the
filename the brief asks for without Node reparsing and warning on every run.
