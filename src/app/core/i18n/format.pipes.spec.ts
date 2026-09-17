import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LanguageService } from './language.service';
import { LumenCurrencyPipe, LumenDatePipe, LumenNumberPipe } from './format.pipes';

describe('format pipes', () => {
	const locale = signal('en-GB');
	const lang = signal<'en' | 'es'>('en');

	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [{ provide: LanguageService, useValue: { intlLocale: locale, current: lang } }]
		});
		locale.set('en-GB');
		lang.set('en');
	});

	it('formats numbers in the active locale', () => {
		const pipe = TestBed.runInInjectionContext(() => new LumenNumberPipe());
		expect(pipe.transform(1234.56, 1)).toBe('1,234.6');
		locale.set('es-ES');
		expect(pipe.transform(1234.56, 1)).toBe('1234,6');
	});

	it('renders an em dash rather than Invalid Date', () => {
		const pipe = TestBed.runInInjectionContext(() => new LumenDatePipe());
		expect(pipe.transform(null)).toBe('-');
		expect(pipe.transform('not-a-date')).toBe('-');
	});

	it('formats a date with an ordinal day in English', () => {
		const pipe = TestBed.runInInjectionContext(() => new LumenDatePipe());
		expect(pipe.transform('2026-01-01')).toBe('1st January, 2026');
		expect(pipe.transform('2026-01-22')).toBe('22nd January, 2026');
		expect(pipe.transform('2026-01-11')).toBe('11th January, 2026');
	});

	it('formats a date the conventional Spanish way, without an ordinal', () => {
		const pipe = TestBed.runInInjectionContext(() => new LumenDatePipe());
		lang.set('es');
		expect(pipe.transform('2026-01-01')).toBe('1 de enero de 2026');
	});

	it('formats currency as euro', () => {
		const pipe = TestBed.runInInjectionContext(() => new LumenCurrencyPipe());
		expect(pipe.transform(4200)).toContain('4,200');
		expect(pipe.transform(4200)).toContain('€');
	});

	it('treats a missing number as zero rather than NaN', () => {
		const pipe = TestBed.runInInjectionContext(() => new LumenNumberPipe());
		expect(pipe.transform(null)).toBe('0');
	});
});
