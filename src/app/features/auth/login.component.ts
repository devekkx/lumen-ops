import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { LOCALES, LanguageService, Locale } from '@core/i18n/language.service';

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
	private readonly transloco = inject(TranslocoService);
	private readonly language = inject(LanguageService);

	readonly locales = LOCALES;
	readonly activeLocale = this.language.current;

	readonly email = signal('');
	readonly password = signal('');
	readonly showPassword = signal(false);
	readonly expired = signal(false);
	readonly busy = signal(false);
	readonly error = signal<string | null>(null);

	/* A session that failed to resolve at bootstrap lands here. Showing why -
	   expired rather than just "sign in" - is the difference between the user
	   knowing what happened and guessing. */
	readonly bootFailure = computed(() => {
		const failure = this.auth.failure();
		if (!failure) return null;
		return failure === 'EXPIRED' ? 'auth.expired' : 'auth.bootFailed';
	});

	/* Injecting LanguageService here - not just in the shell - is what makes
	   the active language (and the switcher below) apply before a session
	   exists at all, rather than only once someone is signed in. */
	use(locale: Locale): void {
		this.language.use(locale);
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
