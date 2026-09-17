import { Component, forwardRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import {
	Subject,
	catchError,
	debounceTime,
	distinctUntilChanged,
	finalize,
	of,
	switchMap
} from 'rxjs';
import { ApiService } from '@core/api/api.service';
import { LumenTooltipDirective } from '@shared/directives/tooltip.directive';

interface PickerLuminaire {
	id: string;
	code: string;
	street: string;
	zone: string;
}

@Component({
	selector: 'lumen-luminaire-picker',
	standalone: true,
	imports: [TranslocoDirective, LumenTooltipDirective],
	templateUrl: './luminaire-picker.component.html',
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => LuminairePickerComponent),
			multi: true
		}
	]
})
export class LuminairePickerComponent implements ControlValueAccessor {
	private readonly _api = inject(ApiService);

	private static _nextId = 0;
	private readonly _uid = LuminairePickerComponent._nextId++;
	readonly listboxId = `luminaire-picker-listbox-${this._uid}`;
	readonly inputId = `luminaire-picker-${this._uid}`;

	readonly query = signal('');
	readonly suggestions = signal<PickerLuminaire[]>([]);
	readonly open = signal(false);
	readonly activeIndex = signal(-1);
	readonly loading = signal(false);
	readonly disabled = signal(false);
	readonly selected = signal<PickerLuminaire | null>(null);

	private readonly _searchTerms = new Subject<string>();
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private _onChange: (value: string | null) => void = () => {};
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private _onTouched: () => void = () => {};

	constructor() {
		this._searchTerms
			.pipe(
				debounceTime(250),
				distinctUntilChanged(),
				switchMap((term) => {
					const needle = term.trim();
					if (!needle) return of<PickerLuminaire[]>([]);

					this.loading.set(true);
					return this._api
						.get<PickerLuminaire[]>('/api/luminaires/search', { q: needle, limit: 8 })
						.pipe(
							catchError(() => of<PickerLuminaire[]>([])),
							finalize(() => this.loading.set(false))
						);
				}),
				takeUntilDestroyed()
			)
			.subscribe((results) => {
				this.suggestions.set(results);
				this.activeIndex.set(results.length ? 0 : -1);
			});
	}

	writeValue(id: string | null): void {
		if (!id) {
			this.selected.set(null);
			this.query.set('');
			return;
		}

		this._api.get<PickerLuminaire>(`/api/luminaires/${id}`).subscribe({
			next: (luminaire) => {
				this.selected.set(luminaire);
				this.query.set(this.labelFor(luminaire));
			},
			error: () => {
				this.selected.set(null);
				this.query.set('');
			}
		});
	}

	registerOnChange(fn: (value: string | null) => void): void {
		this._onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this._onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		this.disabled.set(isDisabled);
	}

	labelFor(luminaire: PickerLuminaire): string {
		return `${luminaire.code} · ${luminaire.street}`;
	}

	onInput(value: string): void {
		this.query.set(value);
		this.open.set(true);

		const current = this.selected();
		if (current && value !== this.labelFor(current)) {
			this.selected.set(null);
			this._onChange(null);
		}

		this._searchTerms.next(value);
	}

	onFocus(): void {
		if (this.query().trim()) this.open.set(true);
	}

	onBlur(): void {
		setTimeout(() => this.open.set(false), 150);
		this._onTouched();
	}

	select(luminaire: PickerLuminaire): void {
		this.selected.set(luminaire);
		this.query.set(this.labelFor(luminaire));
		this.suggestions.set([]);
		this.open.set(false);
		this._onChange(luminaire.id);
		this._onTouched();
	}

	clear(): void {
		this.selected.set(null);
		this.query.set('');
		this.suggestions.set([]);
		this.open.set(false);
		this._onChange(null);
		this._onTouched();
	}

	onKeydown(event: KeyboardEvent): void {
		const items = this.suggestions();

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (items.length) {
					this.open.set(true);
					this.activeIndex.set((this.activeIndex() + 1) % items.length);
				}
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (items.length) {
					this.open.set(true);
					this.activeIndex.set((this.activeIndex() - 1 + items.length) % items.length);
				}
				break;

			case 'Enter': {
				if (!this.open() || !items.length || this.activeIndex() < 0) return;
				event.preventDefault();
				this.select(items[this.activeIndex()]);
				break;
			}

			case 'Escape':
				event.preventDefault();
				if (this.open()) {
					this.open.set(false);
				} else {
					this.clear();
				}
				break;
		}
	}
}
