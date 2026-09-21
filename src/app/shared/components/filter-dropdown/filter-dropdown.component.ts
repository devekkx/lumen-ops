import { Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

export interface FilterToggleEvent {
	value: string;
	checked: boolean;
}

@Component({
	selector: 'lumen-filter-dropdown',
	standalone: true,
	imports: [TranslocoDirective],
	templateUrl: './filter-dropdown.component.html'
})
export class FilterDropdownComponent {
	public readonly label = input.required<string>();
	public readonly optionLabelPrefix = input.required<string>();
	public readonly options = input.required<readonly string[]>();
	public readonly selected = input<readonly string[]>([]);

	public readonly filterToggle = output<FilterToggleEvent>();

	public isOn(value: string): boolean {
		return this.selected().includes(value);
	}
}
