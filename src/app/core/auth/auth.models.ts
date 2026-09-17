export type Role = 'ADMIN' | 'COUNCIL' | 'CONTRACTOR' | 'VIEWER';

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

export type SessionFailure = 'MALFORMED' | 'EXPIRED';

export const ROLE_GROUPS = Object.freeze({
	ALL: ['ADMIN', 'COUNCIL', 'CONTRACTOR', 'VIEWER'],
	COUNCIL: ['ADMIN', 'COUNCIL'],
	CONTRACTOR: ['ADMIN', 'CONTRACTOR'],
	ADMIN: ['ADMIN']
} as const satisfies Record<string, readonly Role[]>);

export type RoleGroup = keyof typeof ROLE_GROUPS;

export const hasAllRoles = (user: SessionUser | null, roles: readonly Role[]): boolean =>
	!!user && roles.every((role) => user.roles.includes(role));

export const hasSomeRole = (user: SessionUser | null, roles: readonly Role[]): boolean =>
	!!user && roles.some((role) => user.roles.includes(role));

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
		seeCosts: council || contractor || admin
	};
};

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
