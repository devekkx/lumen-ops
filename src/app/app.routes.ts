import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';

const feature = (path: string, label: string) => ({
  path,
  data: { breadcrumb: label },
  loadComponent: () => import('./features/placeholder-page.component').then((m) => m.PlaceholderPageComponent)
});

export const routes: Routes = [
  { path: 'auth/login', loadComponent: () => import('./features/login.component').then((m) => m.LoginComponent) },
  {
    path: '', component: ShellComponent, children: [
      { path: '', pathMatch: 'full', redirectTo: 'luminarias' },
      feature('luminarias', 'Luminaires'),
      feature('averias', 'Faults'),
      feature('ordenes-trabajo', 'Work orders'),
      feature('cuadrillas', 'Crews'),
      feature('unauthorized', 'Unauthorized')
    ]
  },
  { path: '**', redirectTo: 'luminarias' }
];
