import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LanguageService } from './language.service';
import { LumenCurrencyPipe, LumenDatePipe, LumenNumberPipe } from './format.pipes';

describe('format pipes', () => {
	const locale = signal('en-GB');

	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			providers: [{ provide: LanguageService, useValue: { intlLocale: locale } }]
		});
		locale.set('en-GB');
	});

	it('formats numbers in the active locale', () => {
		const pipe = TestBed.runInInjectionContext(() => new LumenNumberPipe());
		expect(pipe.transform(1234.56, 1)).toBe('1,234.6');
		locale.set('es-ES');
		expect(pipe.transform(1234.56, 1)).toBe('1234,6');
	});

	it('renders an em dash rather than Invalid Date', () => {
		const pipe = TestBed.runInInjectionContext(() => new LumenDatePipe());
		expect(pipe.transform(null)).toBe('—');
		expect(pipe.transform('not-a-date')).toBe('—');
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
