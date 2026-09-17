import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Role } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';
import { toneFor } from '@shared/models/status-tone';

interface SeededUser {
	id: string;
	email: string;
	name: string;
	org: string;
	roles: Role[];
}

@Component({
	selector: 'lumen-login',
	standalone: true,
	imports: [FormsModule, TranslocoDirective],
	templateUrl: './login.component.html',
	styleUrl: './login.component.scss'
})
export class LoginComponent {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly http = inject(HttpClient);
	private readonly transloco = inject(TranslocoService);

	readonly email = signal('ayto@lumen.madrid');
	readonly password = signal('lumen');
	readonly expired = signal(false);
	readonly busy = signal(false);
	readonly error = signal<string | null>(null);

	/* The four seeded users come from the API rather than being hardcoded here,
	   so the list cannot drift from what the mock will actually accept. */
	readonly users = signal<SeededUser[]>([]);

	/* A session that failed to resolve at bootstrap lands here. Showing why -
	   expired rather than just "sign in" - is the difference between the user
	   knowing what happened and guessing. */
	readonly bootFailure = computed(() => {
		const failure = this.auth.failure();
		if (!failure) return null;
		return failure === 'EXPIRED' ? 'auth.expired' : 'auth.bootFailed';
	});

	constructor() {
		this.http
			.get<SeededUser[]>('/api/auth/users')
			.subscribe({ next: (users) => this.users.set(users), error: () => this.users.set([]) });
	}

	tone(roles: Role[]): string {
		return toneFor(roles[0]);
	}

	initials(name: string): string {
		return name
			.split(' ')
			.map((part) => part[0])
			.slice(0, 2)
			.join('');
	}

	use(user: SeededUser): void {
		this.email.set(user.email);
		this.password.set('lumen');
		void this.submit();
	}

	async submit(): Promise<void> {
		if (this.busy()) return;

		this.busy.set(true);
		this.error.set(null);

		try {
			await this.auth.login({
				email: this.email(),
				password: this.password(),
				expiredToken: this.expired()
			});
			/* Land on `/` and let the four canMatch redirects decide where that
			   is - the login screen does not need to know the role map. */
			await this.router.navigateByUrl('/');
		} catch (error) {
			/* An expired token is a successful request whose payload we then
			   reject, so it surfaces here rather than as an HTTP failure. */
			const expired = this.expired() || (error as { status?: number })?.status !== 401;
			this.error.set(
				this.transloco.translate(expired && this.expired() ? 'auth.expired' : 'auth.invalid')
			);
		} finally {
			this.busy.set(false);
		}
	}
}
