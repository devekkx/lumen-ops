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
	/* False until initializeUser has settled. The shell shows a splash while
	   this is true, which is what stops the login screen flashing on a reload
	   of a deep route. */
	private readonly _bootingState = signal(true);

	readonly user = this._userState.asReadonly();
	readonly failure = this._failureState.asReadonly();
	readonly booting = this._bootingState.asReadonly();
	readonly isAuthenticated = computed(() => this._userState() !== null);

	/* Derived once per session change rather than recomputed per template
	   binding - every row of a 20-row table asks the same questions. */
	readonly abilities = computed<Abilities>(() => abilitiesFor(this._userState()));

	async login(credentials: Credentials): Promise<void> {
		/* Silent: a rejected login already surfaces its own inline message below,
		   so the generic error toast would only repeat it. */
		const response = await firstValueFrom(
			this._http.post<LoginResponse>('/api/auth/login', credentials, {
				context: contextFor({ silent: true })
			})
		);
		this._adopt(response.token);
	}

	logout(): void {
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
	async initializeUser(): Promise<void> {
		try {
			const { user, reason } = userFromToken(this._read());
			if (user) {
				this._userState.set(user);
				this._failureState.set(null);
			} else if (this._read()) {
				/* Only report a failure if there was something to resolve. A
				   first-time visitor has no token and no problem. */
				this._failureState.set(reason);
				this._write(null);
			}
		} finally {
			this._bootingState.set(false);
		}
	}

	hasAllRoles(roles: readonly Role[]): boolean {
		const user = this._userState();
		return !!user && roles.every((role) => user.roles.includes(role));
	}

	hasSomeRole(roles: readonly Role[]): boolean {
		const user = this._userState();
		return !!user && roles.some((role) => user.roles.includes(role));
	}

	token(): string | null {
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

	/* Storage can throw rather than return null - a private window, blocked
	   site data, a preview frame. A session that cannot be persisted should
	   still work for the current tab. */
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
			/* In-memory only for this tab. */
		}
	}
}
