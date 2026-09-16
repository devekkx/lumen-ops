import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

const STORAGE_KEY = 'lumen.language';

/* The one place that knows the current language.

   Nothing else in the app reads localStorage for it and nothing else calls
   TranslocoService.setActiveLang - the Accept-Language interceptor, the header
   switcher and the Intl formatters all read `current` from here. That is the
   whole point of the exercise: the real repo touches localStorage in eleven
   files, and a language that lives in eleven places drifts. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
	private readonly transloco = inject(TranslocoService);
	private readonly state = signal<Locale>(this.restore());

	readonly current = this.state.asReadonly();
	readonly intlLocale = computed(() => (this.state() === 'es' ? 'es-ES' : 'en-GB'));

	constructor() {
		this.transloco.setActiveLang(this.state());
	}

	use(locale: Locale): void {
		if (!LOCALES.includes(locale) || locale === this.state()) return;
		this.state.set(locale);
		this.transloco.setActiveLang(locale);
		document.documentElement.lang = locale;
		this.persist(locale);
	}

	private restore(): Locale {
		const stored = this.read();
		return LOCALES.includes(stored as Locale) ? (stored as Locale) : DEFAULT_LOCALE;
	}

	/* Private browsing and blocked site data both throw on access rather than
	   returning null, so every touch is guarded and the app falls back to the
	   default locale instead of failing to boot. */
	private read(): string | null {
		try {
			return localStorage.getItem(STORAGE_KEY);
		} catch {
			return null;
		}
	}

	private persist(locale: Locale): void {
		try {
			localStorage.setItem(STORAGE_KEY, locale);
		} catch {
			/* A language that cannot be remembered is not worth failing over. */
		}
	}
}
