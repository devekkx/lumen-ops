import { NgTemplateOutlet } from '@angular/common';
import { Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { pillClass } from '../../models/status-tone';
import { Page } from '../../models/pagination';
import { LumenDatePipe } from '@core/i18n/format.pipes';

export interface TableColumn<T> {
	key: Extract<keyof T, string>;
	label: string;
	sortable?: boolean;
}

@Component({
	selector: 'lumen-table',
	standalone: true,
	imports: [TranslocoDirective, NgTemplateOutlet, LumenDatePipe],
	templateUrl: './paginated-table.component.html'
})
export class PaginatedTableComponent<T extends { id: string }> {
	@Input({ required: true }) caption = '';
	@Input({ required: true }) columns: TableColumn<T>[] = [];
	@Input() page: Page<T> | null = null;
	@Input() loading = false;
	@Input() error: string | null = null;
	@Input() sortProperty: string | null = null;
	@Input() sortDirection: 'ASC' | 'DESC' = 'ASC';
	@Input() pillColumns: Readonly<Record<string, string>> = {};
	@Input() dateColumns: readonly string[] = [];

	@Output() readonly sort = new EventEmitter<string>();
	@Output() readonly pageChange = new EventEmitter<number>();
	@Output() readonly perPageChange = new EventEmitter<number>();
	@Output() readonly rowSelected = new EventEmitter<T>();
	@Output() readonly retry = new EventEmitter<void>();

	@ContentChild('rowActions') actionsTemplate: TemplateRef<{ $implicit: T }> | null = null;

	readonly perPageOptions = [10, 20, 50, 100];

	pillClassFor(value: unknown): string {
		return pillClass(value == null ? null : String(value));
	}

	rangeStart(): number {
		if (!this.page || this.page.total === 0) return 0;
		return (this.page.currentPage - 1) * this.page.perPage + 1;
	}

	rangeEnd(): number {
		if (!this.page) return 0;
		return Math.min(this.page.currentPage * this.page.perPage, this.page.total);
	}
}
