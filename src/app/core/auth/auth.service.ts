import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Role, SessionUser } from './auth.models';

const TOKEN_KEY = 'lumen.session.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userState = signal<SessionUser | null>(null);
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.userState() !== null);

  async login(role: Role): Promise<void> {
    const response = await firstValueFrom(this.http.post<{ token: string }>('/api/auth/login', { role }));
    this.setToken(response.token);
  }

  logout(): void { localStorage.removeItem(TOKEN_KEY); this.userState.set(null); }

  async initializeUser(): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try { this.setToken(token, false); } catch { this.logout(); }
  }

  hasAllRoles(roles: readonly Role[]): boolean { const user = this.userState(); return !!user && roles.every((role) => user.roles.includes(role)); }
  hasSomeRoles(roles: readonly Role[]): boolean { const user = this.userState(); return !!user && roles.some((role) => user.roles.includes(role)); }
  token(): string | null { return localStorage.getItem(TOKEN_KEY); }

  private setToken(token: string, persist = true): void {
    const payload = token.split('.')[1];
    if (!payload) throw new Error('Malformed token');
    const decoded = JSON.parse(decodeURIComponent(atob(payload.replace(/-/g, '+').replace(/_/g, '/')).split('').map((character) => `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`).join(''))) as SessionUser;
    if (!decoded.sub || !Array.isArray(decoded.roles) || decoded.exp * 1000 <= Date.now()) throw new Error('Expired or invalid token');
    if (persist) localStorage.setItem(TOKEN_KEY, token);
    this.userState.set(decoded);
  }
}
