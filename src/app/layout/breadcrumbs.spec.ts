import { ActivatedRouteSnapshot } from '@angular/router';
import { crumbsFrom } from './breadcrumbs';

/* A hand-built snapshot chain. The real tree is awkward to construct through
   the router, and what is under test is the walk, not the router. */
const node = (
	segments: string[],
	data: Record<string, unknown>,
	child: ActivatedRouteSnapshot | null = null
): ActivatedRouteSnapshot =>
	({
		url: segments.map((path) => ({ path })),
		data,
		firstChild: child
	}) as unknown as ActivatedRouteSnapshot;

describe('crumbsFrom', () => {
	it('returns nothing for a tree with no breadcrumbs', () => {
		expect(crumbsFrom(node([], {}))).toEqual([]);
	});

	it('skips levels that declare no breadcrumb', () => {
		const tree = node([], {}, node(['luminarias'], { breadcrumb: 'nav.luminaires' }));
		expect(crumbsFrom(tree).map((crumb) => crumb.label)).toEqual(['nav.luminaires']);
	});

	it('accumulates href across levels', () => {
		const tree = node(
			[],
			{},
			node(
				['luminarias'],
				{ breadcrumb: 'nav.luminaires' },
				node(['lum-0312'], { breadcrumbLabel: 'LUM-0312' })
			)
		);
		const crumbs = crumbsFrom(tree);

		expect(crumbs.length).toBe(2);
		expect(crumbs[0].href).toBe('/luminarias');
		expect(crumbs[0].literal).toBe(false);
	});

	/* The last crumb is where you already are. A link to the current page is
	   noise, and aria-current="page" belongs on text, not on an anchor. */
	it('leaves the last crumb unlinked', () => {
		const tree = node(
			[],
			{},
			node(['averias'], { breadcrumb: 'nav.faults' }, node(['nueva'], { breadcrumb: 'fault.new' }))
		);
		const crumbs = crumbsFrom(tree);

		expect(crumbs[0].href).toBe('/averias');
		expect(crumbs[crumbs.length - 1].href).toBeNull();
	});

	/* A resolved label like a luminaire code is not a translation key — looking
	   it up would render "LUM-0312" as a missing key. */
	it('marks a resolved label as literal so it is not translated', () => {
		const tree = node([], {}, node(['lum-0312'], { breadcrumbLabel: 'LUM-0312' }));
		const [crumb] = crumbsFrom(tree);

		expect(crumb.label).toBe('LUM-0312');
		expect(crumb.literal).toBe(true);
	});

	it('prefers a resolved label over a declared key', () => {
		const tree = node(
			[],
			{},
			node(['lum-0312'], { breadcrumb: 'lum.detail', breadcrumbLabel: 'LUM-0312' })
		);
		expect(crumbsFrom(tree)[0].label).toBe('LUM-0312');
	});

	it('walks three levels deep', () => {
		const tree = node(
			[],
			{},
			node(
				['averias'],
				{ breadcrumb: 'nav.faults' },
				node(
					['avr-0001'],
					{ breadcrumbLabel: 'AVR-0001' },
					node(['editar'], { breadcrumb: 'fault.edit' })
				)
			)
		);
		const crumbs = crumbsFrom(tree);

		expect(crumbs.map((crumb) => crumb.label)).toEqual(['nav.faults', 'AVR-0001', 'fault.edit']);
		expect(crumbs.map((crumb) => crumb.href)).toEqual(['/averias', '/averias/avr-0001', null]);
	});

	it('handles a null root', () => {
		expect(crumbsFrom(null)).toEqual([]);
	});
});
