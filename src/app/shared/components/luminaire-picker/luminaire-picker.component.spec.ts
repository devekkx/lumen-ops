import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { getTranslocoModule } from '../../../../testing/transloco-testing';
import { ApiService } from '@core/api/api.service';
import { LuminairePickerComponent } from './luminaire-picker.component';

const luminaire = { id: 'lum-1', code: 'LUM-0001', street: 'Calle Mayor', zone: 'Centro' };

describe('LuminairePickerComponent (ControlValueAccessor)', () => {
	let api: jasmine.SpyObj<ApiService>;

	const render = () => {
		TestBed.resetTestingModule();
		api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
		api.get.and.returnValue(of([]));

		TestBed.configureTestingModule({
			imports: [LuminairePickerComponent, getTranslocoModule()],
			providers: [{ provide: ApiService, useValue: api }]
		});

		const fixture = TestBed.createComponent(LuminairePickerComponent);
		fixture.detectChanges();
		return fixture;
	};

	it('writeValue(null) clears the query and selection without calling the API', () => {
		const fixture = render();
		const cmp = fixture.componentInstance;

		cmp.writeValue(null);

		expect(cmp.query()).toBe('');
		expect(cmp.selected()).toBeNull();
		expect(api.get).not.toHaveBeenCalled();
	});

	it('writeValue(id) resolves the luminaire and renders "CODE · street" as the label', () => {
		const fixture = render();
		api.get.and.returnValue(of(luminaire));

		fixture.componentInstance.writeValue('lum-1');

		expect(api.get).toHaveBeenCalledWith('/api/luminaires/lum-1');
		expect(fixture.componentInstance.selected()).toEqual(luminaire);
		expect(fixture.componentInstance.query()).toBe('LUM-0001 · Calle Mayor');
	});

	it('writeValue(id) empties the picker rather than throwing when the id no longer resolves', () => {
		const fixture = render();
		api.get.and.returnValue(throwError(() => new Error('404')));

		fixture.componentInstance.writeValue('stale-id');

		expect(fixture.componentInstance.selected()).toBeNull();
		expect(fixture.componentInstance.query()).toBe('');
	});

	it('debounces typing before searching, and reports the chosen id back through onChange', fakeAsync(() => {
		const fixture = render();
		api.get.and.returnValue(of([luminaire]));
		const cmp = fixture.componentInstance;
		const onChange = jasmine.createSpy('onChange');
		cmp.registerOnChange(onChange);

		cmp.onInput('may');
		tick(100);
		expect(api.get).not.toHaveBeenCalledWith('/api/luminaires/search', jasmine.anything());

		tick(150); // 250ms total: debounce elapses
		expect(api.get).toHaveBeenCalledWith('/api/luminaires/search', { q: 'may', limit: 8 });
		expect(cmp.suggestions()).toEqual([luminaire]);
		expect(cmp.activeIndex()).toBe(0);

		cmp.select(luminaire);
		expect(onChange).toHaveBeenCalledWith('lum-1');
		expect(cmp.query()).toBe('LUM-0001 · Calle Mayor');
	}));

	it('un-chooses a previously selected luminaire once its label is edited', fakeAsync(() => {
		const fixture = render();
		const cmp = fixture.componentInstance;
		const onChange = jasmine.createSpy('onChange');
		cmp.registerOnChange(onChange);
		cmp.select(luminaire);
		onChange.calls.reset();

		cmp.onInput('LUM-0001 · Calle May');
		tick(250);

		expect(cmp.selected()).toBeNull();
		expect(onChange).toHaveBeenCalledWith(null);
	}));

	it('ArrowDown/ArrowUp cycle activeIndex and wrap, Enter selects the active option', fakeAsync(() => {
		const fixture = render();
		const second = { id: 'lum-2', code: 'LUM-0002', street: 'Gran Via', zone: 'Centro' };
		api.get.and.returnValue(of([luminaire, second]));
		const cmp = fixture.componentInstance;
		const onChange = jasmine.createSpy('onChange');
		cmp.registerOnChange(onChange);

		cmp.onInput('l');
		tick(250);
		expect(cmp.activeIndex()).toBe(0);

		cmp.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
		expect(cmp.activeIndex()).toBe(1);

		cmp.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
		expect(cmp.activeIndex()).toBe(0); // wraps

		cmp.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
		expect(cmp.activeIndex()).toBe(1); // wraps the other way

		cmp.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
		expect(onChange).toHaveBeenCalledWith('lum-2');
		expect(cmp.open()).toBeFalse();
	}));

	it('Escape closes an open list first, and only clears the field on a second Escape', fakeAsync(() => {
		const fixture = render();
		api.get.and.returnValue(of([luminaire]));
		const cmp = fixture.componentInstance;

		cmp.onInput('l');
		tick(250);
		expect(cmp.open()).toBeTrue();

		cmp.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(cmp.open()).toBeFalse();
		expect(cmp.query()).toBe('l'); // first Escape only closes the list

		cmp.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(cmp.query()).toBe(''); // second Escape clears
	}));

	it('setDisabledState reflects onto the disabled signal', () => {
		const fixture = render();
		fixture.componentInstance.setDisabledState(true);
		expect(fixture.componentInstance.disabled()).toBeTrue();
	});
});
