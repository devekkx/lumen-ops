import { ActivatedRouteSnapshot } from '@angular/router';

export interface Crumb {
	label: string;
	href: string | null;
	/* Pre-translated labels (a luminaire code, say) skip the translate step —
	   `LUM-0312` is not a key and looking it up would render it as one. */
	literal: boolean;
}

/* Walks the activated-route tree collecting `data.breadcrumb`.
 *
 * A route may resolve a label instead of declaring one — a detail route knows
 * `LUM-0312` only after loading it — so `data.breadcrumbLabel` overrides
 * `data.breadcrumb` and is treated as literal text rather than a key. */
export const crumbsFrom = (root: ActivatedRouteSnapshot | null): Crumb[] => {
	const crumbs: Crumb[] = [];
	const segments: string[] = [];

	for (let node = root; node; node = node.firstChild) {
		const path = node.url.map((segment) => segment.path).filter(Boolean);
		segments.push(...path);

		const literal = node.data['breadcrumbLabel'] as string | undefined;
		const key = node.data['breadcrumb'] as string | undefined;
		if (!literal && !key) continue;

		crumbs.push({
			label: literal ?? key!,
			href: `/${segments.join('/')}`,
			literal: !!literal
		});
	}

	/* The last crumb is where you already are, so it is text, not a link. */
	if (crumbs.length) crumbs[crumbs.length - 1].href = null;
	return crumbs;
};
