export type Role = 'ADMIN' | 'COUNCIL' | 'CONTRACTOR' | 'VIEWER';

export interface SessionUser {
  sub: string;
  roles: Role[];
  exp: number;
}

export const ROLE_GROUPS = {
  ALL: ['ADMIN', 'COUNCIL', 'CONTRACTOR', 'VIEWER'],
  COUNCIL: ['ADMIN', 'COUNCIL'],
  CONTRACTOR: ['ADMIN', 'CONTRACTOR'],
  ADMIN: ['ADMIN']
} as const satisfies Record<string, readonly Role[]>;
