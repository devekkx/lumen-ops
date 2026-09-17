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
	private readonly _auth = inject(AuthService);
	private readonly _router = inject(Router);
	private readonly _transloco = inject(TranslocoService);
	private readonly _language = inject(LanguageService);

	readonly locales = LOCALES;
	readonly activeLocale = this._language.current;

	readonly email = signal('');
	readonly password = signal('');
	readonly showPassword = signal(false);
	readonly busy = signal(false);
	readonly error = signal<string | null>(null);

	readonly bootFailure = computed(() => {
		const failure = this._auth.failure();
		if (!failure) return null;
		return failure === 'EXPIRED' ? 'auth.expired' : 'auth.bootFailed';
	});

	/* Injecting LanguageService here - not just in the shell - is what makes
	   the active language (and the switcher below) apply before a session
	   exists at all, rather than only once someone is signed in. */
	use(locale: Locale): void {
		this._language.use(locale);
	}

	async submit(): Promise<void> {
		if (this.busy()) return;

		this.busy.set(true);
		this.error.set(null);

		try {
			await this._auth.login({
				email: this.email(),
				password: this.password()
			});
			await this._router.navigateByUrl('/');
		} catch {
			this.error.set(this._transloco.translate('auth.invalid'));
		} finally {
			this.busy.set(false);
		}
	}
}
