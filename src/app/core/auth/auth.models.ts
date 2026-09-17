export type Role = 'ADMIN' | 'COUNCIL' | 'CONTRACTOR' | 'VIEWER';

/* What the token's payload actually carries. The app decodes it; it never
   verifies it - the mock signature is not real, and that is fine, because the
   shape is what the client depends on. */
export interface TokenPayload {
	sub: string;
	name: string;
	email: string;
	org: string;
	roles: Role[];
	iat?: number;
	exp: number;
}

export interface SessionUser {
	id: string;
	name: string;
	email: string;
	org: string;
	roles: Role[];
	exp: number;
}

/* Why a session could not be resolved. The distinction matters: an expired
   token means "sign in again", a malformed one means the stored value is junk
   and should be discarded without telling the user to retry. */
export type SessionFailure = 'MALFORMED' | 'EXPIRED';

/* `as const` before the freeze, so the values stay literal Role tuples rather
   than widening to string[] - which is what lets `satisfies` actually check
   that every entry really is a list of Roles. */
export const ROLE_GROUPS = Object.freeze({
	ALL: ['ADMIN', 'COUNCIL', 'CONTRACTOR', 'VIEWER'],
	COUNCIL: ['ADMIN', 'COUNCIL'],
	CONTRACTOR: ['ADMIN', 'CONTRACTOR'],
	ADMIN: ['ADMIN']
} as const satisfies Record<string, readonly Role[]>);

/* Routes reference a group, never a role string inline. One place to change
   when a role gains access to something. */
export type RoleGroup = keyof typeof ROLE_GROUPS;

export const hasAllRoles = (user: SessionUser | null, roles: readonly Role[]): boolean =>
	!!user && roles.every((role) => user.roles.includes(role));

export const hasSomeRole = (user: SessionUser | null, roles: readonly Role[]): boolean =>
	!!user && roles.some((role) => user.roles.includes(role));

/* A flat record of booleans computed once from the current user, for the logic
   that is not simply show/hide - disabled states, which columns exist, whether
   a bulk action is offered at all. */
export interface Abilities {
	viewLuminaires: boolean;
	viewFaults: boolean;
	createFault: boolean;
	editFault: boolean;
	validateFault: boolean;
	rejectFault: boolean;
	closeFault: boolean;
	deleteFault: boolean;
	assignCrew: boolean;
	startOrder: boolean;
	completeOrder: boolean;
	editCrew: boolean;
	exportData: boolean;
	seeDiagnostics: boolean;
	seeCosts: boolean;
}

export const abilitiesFor = (user: SessionUser | null): Abilities => {
	const admin = hasSomeRole(user, ['ADMIN']);
	const council = hasSomeRole(user, ['COUNCIL']) || admin;
	const contractor = hasSomeRole(user, ['CONTRACTOR']) || admin;

	return {
		viewLuminaires: !!user,
		viewFaults: !!user,
		createFault: council,
		editFault: council,
		validateFault: council,
		rejectFault: council,
		closeFault: contractor,
		deleteFault: admin,
		assignCrew: contractor,
		startOrder: contractor,
		completeOrder: contractor,
		editCrew: admin,
		exportData: council || contractor,
		seeDiagnostics: admin,
		seeCosts: council || admin
	};
};

/* Every write action rendered in a table row declares the ability it needs, so
   the "a VIEWER's DOM contains no write actions" spec can assert against one
   list instead of enumerating buttons by hand and going stale. */
export const WRITE_ABILITIES = Object.freeze([
	'createFault',
	'editFault',
	'validateFault',
	'rejectFault',
	'closeFault',
	'deleteFault',
	'assignCrew',
	'startOrder',
	'completeOrder',
	'editCrew'
] as const satisfies readonly (keyof Abilities)[]);
