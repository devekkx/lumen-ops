import { Role } from '@core/auth/auth.models';
import { ROLE_GROUPS } from '@core/auth/auth.models';

export interface NavItem {
	path: string;
	label: string;
	/* The icon's SVG path data. Inline rather than an icon font or a sprite:
	   six glyphs is not worth a dependency, and `stroke="currentColor"` makes
	   them inherit the active/hover colour for free. */
	d: string;
	roles?: readonly Role[];
}

export interface NavGroup {
	label: string;
	items: readonly NavItem[];
}

/* Grouped the way the canvas groups them — what you do, then what you look up. */
export const NAV_GROUPS: readonly NavGroup[] = [
	{
		label: 'nav.section.operation',
		items: [
			{
				path: '/panel',
				label: 'nav.dashboard',
				roles: ROLE_GROUPS.COUNCIL,
				d: 'M3 13h7V3H3v10Zm0 8h7v-6H3v6Zm11 0h7V11h-7v10Zm0-18v6h7V3h-7Z'
			},
			{
				path: '/averias',
				label: 'nav.faults',
				d: 'm12 3 9 16H3l9-16Zm0 6v5m0 3h.01'
			},
			{
				path: '/ordenes-trabajo',
				label: 'nav.orders',
				roles: ROLE_GROUPS.CONTRACTOR,
				d: 'M9 4h6v3H9V4ZM7 5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 12h6m-6 4h6'
			},
			{
				path: '/cuadrillas',
				label: 'nav.crews',
				roles: ROLE_GROUPS.CONTRACTOR,
				d: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 2.7-5 6-5s6 2 6 5m2-5c2.8.3 6 2 6 5'
			}
		]
	},
	{
		label: 'nav.section.reference',
		items: [
			{
				path: '/luminarias',
				label: 'nav.luminaires',
				d: 'M6 11 12 4l6 7H6Zm3 0v2a3 3 0 0 0 6 0v-2m-3 6v4'
			},
			{
				path: '/mapa',
				label: 'nav.map',
				d: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'
			}
		]
	}
];
