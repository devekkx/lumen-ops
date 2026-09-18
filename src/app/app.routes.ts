import { Routes } from '@angular/router';
import { ROLE_GROUPS } from './core/auth/auth.models';
import { authGuard, hasRole, hasRoleAndNot, someRoleGuard } from './core/auth/auth.guards';
import { dirtyFormGuard } from './shared/guards/dirty-form.guard';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
	{
		path: 'auth/login',
		loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent)
	},
	{
		path: '',
		component: ShellComponent,
		canActivate: [authGuard],
		children: [
			{
				path: '',
				pathMatch: 'full',
				canMatch: [hasRoleAndNot(['COUNCIL'], ['ADMIN'])],
				redirectTo: 'averias'
			},
			{
				path: '',
				pathMatch: 'full',
				canMatch: [hasRoleAndNot(['CONTRACTOR'], ['ADMIN'])],
				redirectTo: 'ordenes-trabajo'
			},
			{
				path: '',
				pathMatch: 'full',
				canMatch: [hasRoleAndNot(['VIEWER'], ['ADMIN', 'COUNCIL', 'CONTRACTOR'])],
				redirectTo: 'luminarias'
			},
			{
				path: '',
				pathMatch: 'full',
				canMatch: [hasRole(['ADMIN'])],
				redirectTo: 'panel'
			},
			{ path: '', pathMatch: 'full', redirectTo: 'luminarias' },

			{
				path: 'panel',
				data: { breadcrumb: 'nav.dashboard', roles: ROLE_GROUPS.COUNCIL, preload: false },
				canActivate: [someRoleGuard],
				loadComponent: () =>
					import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
			},
			{
				path: 'luminarias',
				data: { breadcrumb: 'nav.luminaires' },
				loadComponent: () =>
					import('./features/luminaires/luminaires-page.component').then(
						(m) => m.LuminairesPageComponent
					)
			},
			{
				path: 'averias',
				data: { breadcrumb: 'nav.faults' },
				loadComponent: () =>
					import('./features/faults/faults-page.component').then((m) => m.FaultsPageComponent)
			},
			{
				path: 'averias/nueva',
				data: { breadcrumb: 'fault.new', roles: ROLE_GROUPS.COUNCIL },
				canActivate: [someRoleGuard],
				canDeactivate: [dirtyFormGuard],
				loadComponent: () =>
					import('./features/faults/fault-form.component').then((m) => m.FaultFormComponent)
			},
			{
				path: 'averias/:id/editar',
				data: { breadcrumb: 'fault.edit', roles: ROLE_GROUPS.COUNCIL },
				canActivate: [someRoleGuard],
				canDeactivate: [dirtyFormGuard],
				loadComponent: () =>
					import('./features/faults/fault-form.component').then((m) => m.FaultFormComponent)
			},
			{
				path: 'ordenes-trabajo',
				data: { breadcrumb: 'nav.orders', roles: ROLE_GROUPS.CONTRACTOR },
				canActivate: [someRoleGuard],
				loadComponent: () =>
					import('./features/work-orders/work-orders-page.component').then(
						(m) => m.WorkOrdersPageComponent
					)
			},
			{
				path: 'cuadrillas',
				data: { breadcrumb: 'nav.crews', roles: ROLE_GROUPS.CONTRACTOR },
				canActivate: [someRoleGuard],
				loadComponent: () =>
					import('./features/crews/crews-page.component').then((m) => m.CrewsPageComponent)
			},
			{
				path: 'diagnosticos',
				data: { breadcrumb: 'nav.diagnostics', roles: ROLE_GROUPS.ADMIN },
				canActivate: [someRoleGuard],
				loadComponent: () =>
					import('./features/diagnostics/diagnostics-page.component').then(
						(m) => m.DiagnosticsPageComponent
					)
			},
			{
				path: 'mapa',
				data: { breadcrumb: 'nav.map', preload: false },
				loadComponent: () =>
					import('./features/luminaires/luminaire-map.component').then(
						(m) => m.LuminaireMapComponent
					)
			},
			{
				path: 'unauthorized',
				data: { breadcrumb: 'unauth.title' },
				loadComponent: () =>
					import('./features/auth/unauthorized.component').then((m) => m.UnauthorizedComponent)
			}
		]
	},
	{ path: '**', redirectTo: '' }
];
