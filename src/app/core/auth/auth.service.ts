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
	/* Asks the mock for a token that is already expired, so the
	   app-initializer failure path can be triggered from the login screen
	   rather than by hand-editing storage. */
	expiredToken?: boolean;
}

interface LoginResponse {
	token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
	private readonly http = inject(HttpClient);

	private readonly userState = signal<SessionUser | null>(null);
	private readonly failureState = signal<SessionFailure | null>(null);
	/* False until initializeUser has settled. The shell shows a splash while
	   this is true, which is what stops the login screen flashing on a reload
	   of a deep route. */
	private readonly bootingState = signal(true);

	readonly user = this.userState.asReadonly();
	readonly failure = this.failureState.asReadonly();
	readonly booting = this.bootingState.asReadonly();
	readonly isAuthenticated = computed(() => this.userState() !== null);

	/* Derived once per session change rather than recomputed per template
	   binding - every row of a 20-row table asks the same questions. */
	readonly abilities = computed<Abilities>(() => abilitiesFor(this.userState()));

	async login(credentials: Credentials): Promise<void> {
		/* Silent: a rejected login already surfaces its own inline message below,
		   so the generic error toast would only repeat it. */
		const response = await firstValueFrom(
			this.http.post<LoginResponse>('/api/auth/login', credentials, {
				context: contextFor({ silent: true })
			})
		);
		this.adopt(response.token);
	}

	logout(): void {
		this.write(null);
		this.userState.set(null);
		this.failureState.set(null);
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
			const { user, reason } = userFromToken(this.read());
			if (user) {
				this.userState.set(user);
				this.failureState.set(null);
			} else if (this.read()) {
				/* Only report a failure if there was something to resolve. A
				   first-time visitor has no token and no problem. */
				this.failureState.set(reason);
				this.write(null);
			}
		} finally {
			this.bootingState.set(false);
		}
	}

	hasAllRoles(roles: readonly Role[]): boolean {
		const user = this.userState();
		return !!user && roles.every((role) => user.roles.includes(role));
	}

	hasSomeRole(roles: readonly Role[]): boolean {
		const user = this.userState();
		return !!user && roles.some((role) => user.roles.includes(role));
	}

	token(): string | null {
		return this.read();
	}

	private adopt(token: string): void {
		const { user, reason } = userFromToken(token);
		if (!user) {
			this.failureState.set(reason);
			throw new Error(`Session token rejected: ${reason}`);
		}
		this.write(token);
		this.userState.set(user);
		this.failureState.set(null);
	}

	/* Storage can throw rather than return null - a private window, blocked
	   site data, a preview frame. A session that cannot be persisted should
	   still work for the current tab. */
	private read(): string | null {
		try {
			return localStorage.getItem(TOKEN_KEY);
		} catch {
			return null;
		}
	}

	private write(token: string | null): void {
		try {
			if (token) localStorage.setItem(TOKEN_KEY, token);
			else localStorage.removeItem(TOKEN_KEY);
		} catch {
			/* In-memory only for this tab. */
		}
	}
}
