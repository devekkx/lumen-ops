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
	@Input({ required: true }) public caption = '';
	@Input({ required: true }) public columns: TableColumn<T>[] = [];
	@Input() public page: Page<T> | null = null;
	@Input() public loading = false;
	@Input() public error: string | null = null;
	@Input() public sortProperty: string | null = null;
	@Input() public sortDirection: 'ASC' | 'DESC' = 'ASC';
	@Input() public pillColumns: Readonly<Record<string, string>> = {};
	@Input() public dateColumns: readonly string[] = [];

	@Output() public readonly sort = new EventEmitter<string>();
	@Output() public readonly pageChange = new EventEmitter<number>();
	@Output() public readonly perPageChange = new EventEmitter<number>();
	@Output() public readonly rowSelected = new EventEmitter<T>();
	@Output() public readonly retry = new EventEmitter<void>();

	@ContentChild('rowActions') public actionsTemplate: TemplateRef<{ $implicit: T }> | null = null;

	public readonly perPageOptions = [10, 20, 50, 100];

	public pillClassFor(value: unknown): string {
		return pillClass(value == null ? null : String(value));
	}

	public rangeStart(): number {
		if (!this.page || this.page.total === 0) return 0;
		return (this.page.currentPage - 1) * this.page.perPage + 1;
	}

	public rangeEnd(): number {
		if (!this.page) return 0;
		return Math.min(this.page.currentPage * this.page.perPage, this.page.total);
	}
}
