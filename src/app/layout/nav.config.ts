import { Role } from '@core/auth/auth.models';
import { ROLE_GROUPS } from '@core/auth/auth.models';

export interface NavItem {
	path: string;
	label: string;
	/* A Bootstrap Icons glyph name (the part after `bi-`), rendered as
	   `<i class="bi bi-{{icon}}">` - `currentColor` still carries through (the
	   icon font glyph is drawn in the element's own `color`), so it inherits
	   the active/hover colour the same way the hand-drawn SVGs used to. */
	icon: string;
	roles?: readonly Role[];
}

export interface NavGroup {
	label: string;
	items: readonly NavItem[];
}

/* Grouped the way the canvas groups them - what you do, then what you look up. */
export const NAV_GROUPS: readonly NavGroup[] = [
	{
		label: 'nav.section.operation',
		items: [
			{
				path: '/panel',
				label: 'nav.dashboard',
				roles: ROLE_GROUPS.COUNCIL,
				icon: 'speedometer2'
			},
			{
				path: '/averias',
				label: 'nav.faults',
				icon: 'exclamation-triangle'
			},
			{
				path: '/ordenes-trabajo',
				label: 'nav.orders',
				roles: ROLE_GROUPS.CONTRACTOR,
				icon: 'clipboard-check'
			},
			{
				path: '/cuadrillas',
				label: 'nav.crews',
				roles: ROLE_GROUPS.CONTRACTOR,
				icon: 'people'
			}
		]
	},
	{
		label: 'nav.section.reference',
		items: [
			{
				path: '/luminarias',
				label: 'nav.luminaires',
				icon: 'lightbulb'
			},
			{
				path: '/mapa',
				label: 'nav.map',
				icon: 'geo-alt'
			},
			{
				path: '/diagnosticos',
				label: 'nav.diagnostics',
				roles: ROLE_GROUPS.ADMIN,
				icon: 'bug'
			}
		]
	}
];
