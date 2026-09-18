import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { contextFor } from '../api/api-options';
import { Abilities, Role, SessionFailure, SessionUser, abilitiesFor } from './auth.models';
import { userFromToken } from './jwt';

const TOKEN_KEY = 'lumen.session.token';

export interface Credentials {
	email: string;
	password: string;
}

interface LoginResponse {
	token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
	private readonly _http = inject(HttpClient);

	private readonly _userState = signal<SessionUser | null>(null);
	private readonly _failureState = signal<SessionFailure | null>(null);
	private readonly _bootingState = signal(true);

	public readonly user = this._userState.asReadonly();
	public readonly failure = this._failureState.asReadonly();
	public readonly booting = this._bootingState.asReadonly();
	public readonly isAuthenticated = computed(() => this._userState() !== null);

	public readonly abilities = computed<Abilities>(() => abilitiesFor(this._userState()));

	public async login(credentials: Credentials): Promise<void> {
		const response = await firstValueFrom(
			this._http.post<LoginResponse>('/api/auth/login', credentials, {
				context: contextFor({ silent: true })
			})
		);
		this._adopt(response.token);
	}

	public logout(): void {
		this._write(null);
		this._userState.set(null);
		this._failureState.set(null);
	}

	/* Runs inside provideAppInitializer, so the first route resolves against a
	   known session.
	 *
	 * It deliberately never rejects. A rejected initializer leaves Angular with
	 * nothing bootstrapped and the user staring at a blank page - no login
	 * screen, no error, nothing to act on. Instead the failure is recorded, the
	 * bad token discarded, and the guards send the user to /auth/login where the
	 * reason is shown. See docs/app-initializer.md for what the blank page
	 * actually looked like. */
	public async initializeUser(): Promise<void> {
		try {
			const { user, reason } = userFromToken(this._read());
			if (user) {
				this._userState.set(user);
				this._failureState.set(null);
			} else if (this._read()) {
				this._failureState.set(reason);
				this._write(null);
			}
		} finally {
			this._bootingState.set(false);
		}
	}

	public hasAllRoles(roles: readonly Role[]): boolean {
		const user = this._userState();
		return !!user && roles.every((role) => user.roles.includes(role));
	}

	public hasSomeRole(roles: readonly Role[]): boolean {
		const user = this._userState();
		return !!user && roles.some((role) => user.roles.includes(role));
	}

	public token(): string | null {
		return this._read();
	}

	private _adopt(token: string): void {
		const { user, reason } = userFromToken(token);
		if (!user) {
			this._failureState.set(reason);
			throw new Error(`Session token rejected: ${reason}`);
		}
		this._write(token);
		this._userState.set(user);
		this._failureState.set(null);
	}

	private _read(): string | null {
		try {
			return localStorage.getItem(TOKEN_KEY);
		} catch {
			return null;
		}
	}

	private _write(token: string | null): void {
		try {
			if (token) localStorage.setItem(TOKEN_KEY, token);
			else localStorage.removeItem(TOKEN_KEY);
		} catch {
			/* empty */
		}
	}
}
