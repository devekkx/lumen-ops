import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { DEFAULT_LOCALE, LanguageService } from './language.service';

class TranslocoStub {
	public active: string | null = null;
	public setActiveLang(lang: string) {
		this.active = lang;
	}
}

describe('LanguageService', () => {
	let transloco: TranslocoStub;

	const build = () => {
		TestBed.resetTestingModule();
		transloco = new TranslocoStub();
		TestBed.configureTestingModule({
			providers: [LanguageService, { provide: TranslocoService, useValue: transloco }]
		});
		return TestBed.inject(LanguageService);
	};

	afterEach(() => localStorage.removeItem('lumen.language'));

	it('starts on the default locale and tells Transloco about it', () => {
		const service = build();
		expect(service.current()).toBe(DEFAULT_LOCALE);
		expect(transloco.active).toBe(DEFAULT_LOCALE);
	});

	it('restores a persisted locale', () => {
		localStorage.setItem('lumen.language', 'en');
		expect(build().current()).toBe('en');
	});

	it('ignores a locale it does not support', () => {
		const service = build();
		service.use('de' as never);
		expect(service.current()).toBe(DEFAULT_LOCALE);
	});

	it('maps each locale to an Intl tag', () => {
		const service = build();
		expect(service.intlLocale()).toBe('es-ES');
		service.use('en');
		expect(service.intlLocale()).toBe('en-GB');
	});

	it('switches, persists, and sets the document language', () => {
		const service = build();
		service.use('en');
		expect(transloco.active).toBe('en');
		expect(localStorage.getItem('lumen.language')).toBe('en');
		expect(document.documentElement.lang).toBe('en');
	});

	/* A private window throws on localStorage rather than returning null, and an
	   app that cannot remember a language should still start in one. */
	it('falls back to the default when storage throws', () => {
		const getItem = spyOn(Storage.prototype, 'getItem').and.throwError('denied');
		const setItem = spyOn(Storage.prototype, 'setItem').and.throwError('denied');
		const service = build();
		expect(service.current()).toBe(DEFAULT_LOCALE);
		expect(() => service.use('en')).not.toThrow();
		expect(service.current()).toBe('en');
		expect(getItem).toHaveBeenCalled();
		expect(setItem).toHaveBeenCalled();
	});
});
