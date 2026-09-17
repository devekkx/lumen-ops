import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from './language.service';

@Pipe({ name: 'lumenNumber', standalone: true, pure: false })
export class LumenNumberPipe implements PipeTransform {
	private readonly _language = inject(LanguageService);

	transform(value: number | null | undefined, digits = 0): string {
		return new Intl.NumberFormat(this._language.intlLocale(), {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits
		}).format(value ?? 0);
	}
}

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
	private readonly _language = inject(LanguageService);

	transform(value: string | Date | null | undefined, withTime = false): string {
		if (!value) return '-';
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return '-';

		const time = withTime
			? `, ${new Intl.DateTimeFormat(this._language.intlLocale(), {
					hour: '2-digit',
					minute: '2-digit',
					timeZone: 'UTC'
				}).format(date)}`
			: '';

		if (this._language.current() === 'en') {
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
	private readonly _language = inject(LanguageService);

	transform(value: number | null | undefined): string {
		return new Intl.NumberFormat(this._language.intlLocale(), {
			style: 'currency',
			currency: 'EUR',
			maximumFractionDigits: 0
		}).format(value ?? 0);
	}
}
