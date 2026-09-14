import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Role } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';

@Component({
  standalone: true,
  template: `<main class="login"><section class="card shadow-sm"><div class="card-body"><h1>Lumen Ops</h1><p>Choose a training role to start a mock session.</p><div class="d-grid gap-2">@for (role of roles; track role) { <button class="btn btn-lumen" [disabled]="loading()" (click)="login(role)">Continue as {{ role }}</button> }</div>@if (error()) { <p class="text-danger mt-3 mb-0">{{ error() }}</p> }</div></section></main>`,
  styles: ['.login { min-height: 100vh; display:grid; place-items:center; } .card { width:min(26rem, 90vw); }']
})
export class LoginComponent {
  private readonly auth = inject(AuthService); private readonly router = inject(Router);
  readonly roles: Role[] = ['ADMIN', 'COUNCIL', 'CONTRACTOR', 'VIEWER']; readonly loading = signal(false); readonly error = signal('');
  async login(role: Role): Promise<void> { this.loading.set(true); this.error.set(''); try { await this.auth.login(role); await this.router.navigateByUrl('/'); } catch { this.error.set('Unable to start the training session. Is the mock API running?'); } finally { this.loading.set(false); } }
}
