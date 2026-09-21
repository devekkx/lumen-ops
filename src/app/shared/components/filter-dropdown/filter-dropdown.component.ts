import { Component, EventEmitter, Input, Output } from '@angular/core';
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
	@Input({ required: true }) public label = '';
	@Input({ required: true }) public optionLabelPrefix = '';
	@Input({ required: true }) public options: readonly string[] = [];
	@Input() public selected: readonly string[] = [];

	@Output() public readonly filterToggle = new EventEmitter<FilterToggleEvent>();

	public isOn(value: string): boolean {
		return this.selected.includes(value);
	}
}
