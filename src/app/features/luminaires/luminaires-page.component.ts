import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { PaginatedTableBase } from '@shared/components/paginated-table/paginated-table.base';
import {
	PaginatedTableComponent,
	TableColumn
} from '@shared/components/paginated-table/paginated-table.component';
import { FilterRecord } from '@shared/models/filter';
import { pillClass } from '@shared/models/status-tone';
import { buildFilterConditions, describeFilter, flattenFilters } from '@shared/utils/filters';
import {
	LAMP_TYPES,
	LUMINAIRE_SEARCH_KEYS,
	LUMINAIRE_STATUSES,
	Luminaire,
	LuminaireService
} from './luminaire.service';

@Component({
	selector: 'lumen-luminaires-page',
	standalone: true,
	imports: [AsyncPipe, TranslocoDirective, PaginatedTableComponent],
	templateUrl: './luminaires-page.component.html'
})
export class LuminairesPageComponent extends PaginatedTableBase<Luminaire> {
	protected readonly collection = inject(LuminaireService);

	readonly columns: TableColumn<Luminaire>[] = [
		{ key: 'code', label: 'lum.code', sortable: true },
		{ key: 'street', label: 'lum.street', sortable: true },
		{ key: 'zone', label: 'lum.zone', sortable: true },
		{ key: 'lampType', label: 'lum.lampType', sortable: true },
		{ key: 'wattage', label: 'lum.wattage', sortable: true },
		{ key: 'installedAt', label: 'lum.installedAt', sortable: true },
		{ key: 'status', label: 'lum.status', sortable: true }
	];

	readonly statuses = LUMINAIRE_STATUSES;
	readonly lampTypes = LAMP_TYPES;

	private statusFilter: string[] = [];
	private lampTypeFilter: string[] = [];

	constructor() {
		super([...LUMINAIRE_SEARCH_KEYS], { property: 'code', direction: 'ASC' });
	}

	toggleStatus(value: string, checked: boolean): void {
		this.statusFilter = checked
			? [...this.statusFilter, value]
			: this.statusFilter.filter((entry) => entry !== value);
		this.applyFilters();
	}

	toggleLampType(value: string, checked: boolean): void {
		this.lampTypeFilter = checked
			? [...this.lampTypeFilter, value]
			: this.lampTypeFilter.filter((entry) => entry !== value);
		this.applyFilters();
	}

	isStatusOn(value: string): boolean {
		return this.statusFilter.includes(value);
	}

	isLampTypeOn(value: string): boolean {
		return this.lampTypeFilter.includes(value);
	}

	/* Rebuilds the readable DSL lines straight from the same builder the
	   request itself goes through, so the inspector can never drift from what
	   is actually being sent. */
	dslLines(): string[] {
		const built = buildFilterConditions(this.filters);
		return flattenFilters(built).map(
			(filter) => '  '.repeat(filter.depth) + describeFilter(filter)
		);
	}

	tone(value: string): string {
		return pillClass(value);
	}

	private applyFilters(): void {
		const record: FilterRecord = {};
		if (this.statusFilter.length) record['status'] = this.statusFilter;
		if (this.lampTypeFilter.length) record['lampType'] = this.lampTypeFilter;
		this.setFilters(record);
	}
}
