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

/* English has no single Intl option for "1st January, 2026" - day-first, an
   ordinal suffix, and a comma before the year - so 'en' builds the day/month/
   year by hand; 'es' keeps Intl's own "1 de enero de 2026", which is already
   the natural long form (Spanish dates don't take an ordinal suffix). */
const ordinal = (day: number): string => {
	const remainder = day % 100;
	if (remainder >= 11 && remainder <= 13) return `${day}th`;
	switch (day % 10) {
		case 1:
			return `${day}st`;
		case 2:
			return `${day}nd`;
		case 3:
			return `${day}rd`;
		default:
			return `${day}th`;
	}
};

@Pipe({ name: 'lumenDate', standalone: true, pure: false })
export class LumenDatePipe implements PipeTransform {
	private readonly language = inject(LanguageService);

	transform(value: string | Date | null | undefined, withTime = false): string {
		if (!value) return '-';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '-';

		/* UTC, not local time: most values here are date-only strings
		   ("2026-01-28") that Date parses as UTC midnight - reading them back
		   with local getters would roll the day back a day for anyone west
		   of UTC. */
		const time = withTime
			? `, ${new Intl.DateTimeFormat(this.language.intlLocale(), {
					hour: '2-digit',
					minute: '2-digit',
					timeZone: 'UTC'
				}).format(date)}`
			: '';

		if (this.language.current() === 'en') {
			const month = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(
				date
			);
			return `${ordinal(date.getUTCDate())} ${month}, ${date.getUTCFullYear()}${time}`;
		}

		const long = new Intl.DateTimeFormat('es-ES', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(date);
		return `${long}${time}`;
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
