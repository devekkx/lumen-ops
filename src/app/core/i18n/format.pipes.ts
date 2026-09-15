import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from './language.service';

/* Number, date and currency formatting all route through the active locale, so
   switching language relabels chart axes and table cells without a reload.
   Impure on purpose: the locale is a signal, and a pure pipe would keep the
   first render's formatting forever. */

@Pipe({ name: 'lumenNumber', standalone: true, pure: false })
export class LumenNumberPipe implements PipeTransform {
	private readonly language = inject(LanguageService);

	transform(value: number | null | undefined, digits = 0): string {
		return new Intl.NumberFormat(this.language.intlLocale(), {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits
		}).format(value ?? 0);
	}
}

@Pipe({ name: 'lumenDate', standalone: true, pure: false })
export class LumenDatePipe implements PipeTransform {
	private readonly language = inject(LanguageService);

	transform(value: string | Date | null | undefined, withTime = false): string {
		if (!value) return '—';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat(this.language.intlLocale(), {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
		}).format(date);
	}
}

@Pipe({ name: 'lumenCurrency', standalone: true, pure: false })
export class LumenCurrencyPipe implements PipeTransform {
	private readonly language = inject(LanguageService);

	transform(value: number | null | undefined): string {
		return new Intl.NumberFormat(this.language.intlLocale(), {
			style: 'currency',
			currency: 'EUR',
			maximumFractionDigits: 0
		}).format(value ?? 0);
	}
}
