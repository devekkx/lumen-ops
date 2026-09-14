import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { authGuard, rolesGuard } from './core/auth/auth.guards';
import { ROLE_GROUPS } from './core/auth/auth.models';

const feature = (path: string, label: string) => ({
  path,
  data: { breadcrumb: label },
  loadComponent: () => import('./features/placeholder-page.component').then((m) => m.PlaceholderPageComponent)
});

export const routes: Routes = [
  { path: 'auth/login', loadComponent: () => import('./features/login.component').then((m) => m.LoginComponent) },
  {
    path: '', component: ShellComponent, canActivate: [authGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'luminarias' },
      feature('luminarias', 'Luminaires'),
      { ...feature('averias', 'Faults'), canActivate: [rolesGuard], data: { breadcrumb: 'Faults', roles: ROLE_GROUPS.COUNCIL } },
      { ...feature('ordenes-trabajo', 'Work orders'), canActivate: [rolesGuard], data: { breadcrumb: 'Work orders', roles: ROLE_GROUPS.CONTRACTOR } },
      feature('cuadrillas', 'Crews'),
      feature('unauthorized', 'Unauthorized')
    ]
  },
  { path: '**', redirectTo: 'luminarias' }
];
