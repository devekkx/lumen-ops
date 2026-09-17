import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

const STORAGE_KEY = 'lumen.language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
	private readonly _transloco = inject(TranslocoService);
	private readonly _state = signal<Locale>(this._restore());

	public readonly current = this._state.asReadonly();
	public readonly intlLocale = computed(() => (this._state() === 'es' ? 'es-ES' : 'en-GB'));

	constructor() {
		this._transloco.setActiveLang(this._state());
	}

	public use(locale: Locale): void {
		if (!LOCALES.includes(locale) || locale === this._state()) return;
		this._state.set(locale);
		this._transloco.setActiveLang(locale);
		document.documentElement.lang = locale;
		this._persist(locale);
	}

	private _restore(): Locale {
		const stored = this._read();
		return LOCALES.includes(stored as Locale) ? (stored as Locale) : DEFAULT_LOCALE;
	}

	private _read(): string | null {
		try {
			return localStorage.getItem(STORAGE_KEY);
		} catch {
			return null;
		}
	}

	private _persist(locale: Locale): void {
		try {
			localStorage.setItem(STORAGE_KEY, locale);
		} catch {
			/* empty */
		}
	}
}
