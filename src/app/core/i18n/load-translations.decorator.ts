import { TRANSLOCO_SCOPE } from '@jsverse/transloco';

/* @LoadTranslations('map') - the class-decorator form the real repo uses.

   It appends a TRANSLOCO_SCOPE provider to the decorated component's own
   providers, so /i18n/map/<lang>.json is fetched the first time that component
   is created and never ships in the root bundle. Declaring it as a decorator
   rather than a providers entry keeps the scope next to the component it
   belongs to, which is what makes it hard to forget when a feature moves.

   Angular reads `ɵcmp` after decoration, so mutating the definition's provider
   list here is enough - there is no need to re-run the component compiler. */
export function LoadTranslations(scope: string, alias?: string): ClassDecorator {
	return (target) => {
		const definition = (target as unknown as { ɵcmp?: { providers?: unknown[] } }).ɵcmp;
		const provider = { provide: TRANSLOCO_SCOPE, useValue: { scope, alias }, multi: true };

		if (definition) {
			definition.providers = [...(definition.providers ?? []), provider];
		} else {
			/* Decorators run before the component definition exists when the class
			   is compiled ahead of time, so stash it and let Angular pick it up
			   from the static providers the component already declares. */
			const pending = target as unknown as { ɵɵpendingScopes?: unknown[] };
			pending.ɵɵpendingScopes = [...(pending.ɵɵpendingScopes ?? []), provider];
		}

		return target;
	};
}

/* Reads back which scopes a component asked for - used by the spec to assert a
   feature really did declare its own bundle rather than leaning on the root. */
export const declaredScopes = (target: unknown): unknown[] => {
	const definition = (target as { ɵcmp?: { providers?: unknown[] } }).ɵcmp;
	const fromDefinition = definition?.providers ?? [];
	const pending = (target as { ɵɵpendingScopes?: unknown[] }).ɵɵpendingScopes ?? [];
	return [...fromDefinition, ...pending];
};
