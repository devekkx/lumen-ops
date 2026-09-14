import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Role } from './auth.models';

const redirect = (commands: string[]) => inject(Router).createUrlTree(commands);
export const authGuard: CanActivateFn = () => inject(AuthService).isAuthenticated() || redirect(['/auth/login']);
export const rolesGuard: CanActivateFn = (route) => { const roles = (route.data['roles'] ?? []) as Role[]; return inject(AuthService).hasSomeRoles(roles) || redirect(['/unauthorized']); };
export const someRolesMatchGuard = (roles: readonly Role[]): CanMatchFn => () => inject(AuthService).hasSomeRoles(roles);
