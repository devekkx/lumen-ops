# TypeScript configuration notes

This workspace intentionally keeps `strict: false` while `strictTemplates: true`. That permits legacy-style TypeScript patterns such as nullable values and loose assignments during the migration exercises, while preserving template checking where data is displayed to users. The planned migration is to turn on `strictNullChecks` first, resolve the resulting model boundaries, then enable the remaining strict options.
