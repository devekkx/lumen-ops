/* Four seeded users and a JWT-shaped token.
 *
 * The signature is not real and does not need to be — the app decodes the
 * payload on day 2, it never verifies it. What has to be right is the *shape*:
 * three dot-separated base64url segments carrying sub, roles and exp.
 */

export type Role = 'ADMIN' | 'COUNCIL' | 'CONTRACTOR' | 'VIEWER';

export interface SeededUser {
	id: string;
	email: string;
	password: string;
	name: string;
	org: string;
	roles: Role[];
}

export const USERS: readonly SeededUser[] = [
	{ id: 'u-admin', email: 'admin@lumen.madrid', password: 'lumen', name: 'Elena Rivas', org: 'Dirección General de Alumbrado', roles: ['ADMIN'] },
	{ id: 'u-council', email: 'ayto@lumen.madrid', password: 'lumen', name: 'Marta Gil Soler', org: 'Área de Obras y Equipamientos', roles: ['COUNCIL'] },
	{ id: 'u-contractor', email: 'contrata@lumen.madrid', password: 'lumen', name: 'Diego Ferrán', org: 'Iluminia Servicios', roles: ['CONTRACTOR'] },
	{ id: 'u-viewer', email: 'consulta@lumen.madrid', password: 'lumen', name: 'Paula Ortega', org: 'Intervención General', roles: ['VIEWER'] }
];

const base64Url = (text: string) => Buffer.from(text, 'utf8').toString('base64url');

/* A negative TTL is not an accident — the login screen offers an
   already-expired token on purpose, so the app-initializer failure path in
   exercise 2.1 can be triggered from the UI rather than by editing storage. */
export const signToken = (user: SeededUser, ttlMinutes = 60): string => {
	const issuedAt = Math.floor(Date.now() / 1000);
	const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const payload = base64Url(
		JSON.stringify({
			sub: user.id,
			name: user.name,
			email: user.email,
			org: user.org,
			roles: user.roles,
			iat: issuedAt,
			exp: issuedAt + ttlMinutes * 60
		})
	);
	return `${header}.${payload}.mock-signature-not-verified`;
};

export const findUser = (email: unknown): SeededUser | undefined =>
	USERS.find(
		(user) =>
			user.email.toLowerCase() ===
			String(email ?? '')
				.trim()
				.toLowerCase()
	);

/* Never send the password back, even on the happy path. */
export const publicUser = ({ password, ...rest }: SeededUser) => rest;
