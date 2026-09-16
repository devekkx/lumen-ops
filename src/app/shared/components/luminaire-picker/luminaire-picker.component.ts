import { Component, forwardRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { ApiService } from '@core/api/api.service';

/* Just enough of the luminaire shape to label a suggestion — reimplemented
   locally rather than importing @features/luminaires' Luminaire, the same
   "wire contract, not shared code" convention as luminaire.service.ts and
   fault.service.ts, and it keeps this shared component free of a dependency
   on a feature module. */
interface PickerLuminaire {
	id: string;
	code: string;
	street: string;
	zone: string;
}

/* A typeahead ControlValueAccessor over `GET /api/luminaires/search`. The
 * form value is the luminaire's id (a plain string), matching
 * Fault.luminaireId — this component owns turning that id into a label and
 * back, so the form around it never has to know the luminaire's code or
 * street, only its id.
 */
@Component({
	selector: 'lumen-luminaire-picker',
	standalone: true,
	imports: [TranslocoDirective],
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
	private readonly api = inject(ApiService);

	private static nextId = 0;
	readonly listboxId = `luminaire-picker-listbox-${LuminairePickerComponent.nextId++}`;

	readonly query = signal('');
	readonly suggestions = signal<PickerLuminaire[]>([]);
	readonly open = signal(false);
	readonly activeIndex = signal(-1);
	readonly loading = signal(false);
	readonly disabled = signal(false);
	readonly selected = signal<PickerLuminaire | null>(null);

	private readonly searchTerms = new Subject<string>();
	private onChange: (value: string | null) => void = () => {};
	private onTouched: () => void = () => {};

	constructor() {
		this.searchTerms
			.pipe(
				debounceTime(250),
				distinctUntilChanged(),
				switchMap((term) => {
					const needle = term.trim();
					if (!needle) return of<PickerLuminaire[]>([]);

					this.loading.set(true);
					return this.api
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

	/* ControlValueAccessor */

	writeValue(id: string | null): void {
		if (!id) {
			this.selected.set(null);
			this.query.set('');
			return;
		}

		this.api.get<PickerLuminaire>(`/api/luminaires/${id}`).subscribe({
			next: (luminaire) => {
				this.selected.set(luminaire);
				this.query.set(this.labelFor(luminaire));
			},
			/* The id on the form no longer resolves (deleted luminaire, stale
			   fixture) — show an empty picker rather than throwing, the field's
			   own required validator is what surfaces the problem. */
			error: () => {
				this.selected.set(null);
				this.query.set('');
			}
		});
	}

	registerOnChange(fn: (value: string | null) => void): void {
		this.onChange = fn;
	}

	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}

	setDisabledState(isDisabled: boolean): void {
		this.disabled.set(isDisabled);
	}

	/* Template */

	labelFor(luminaire: PickerLuminaire): string {
		return `${luminaire.code} · ${luminaire.street}`;
	}

	onInput(value: string): void {
		this.query.set(value);
		this.open.set(true);

		/* Typing over a previously chosen label un-chooses it — the form value
		   must not keep pointing at a luminaire whose code the user is in the
		   middle of erasing. */
		const current = this.selected();
		if (current && value !== this.labelFor(current)) {
			this.selected.set(null);
			this.onChange(null);
		}

		this.searchTerms.next(value);
	}

	onFocus(): void {
		if (this.query().trim()) this.open.set(true);
	}

	onBlur(): void {
		/* The listbox binds selection to (mousedown), which fires before this
		   blur, so a pointer selection is never lost to it. This still runs a
		   beat later so any option list still visible closes once focus has
		   genuinely left, and reports touched either way. */
		setTimeout(() => this.open.set(false), 150);
		this.onTouched();
	}

	select(luminaire: PickerLuminaire): void {
		this.selected.set(luminaire);
		this.query.set(this.labelFor(luminaire));
		this.suggestions.set([]);
		this.open.set(false);
		this.onChange(luminaire.id);
		this.onTouched();
	}

	clear(): void {
		this.selected.set(null);
		this.query.set('');
		this.suggestions.set([]);
		this.open.set(false);
		this.onChange(null);
		this.onTouched();
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
