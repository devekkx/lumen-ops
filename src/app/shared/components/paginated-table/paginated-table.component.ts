import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Page } from '../../models/pagination';

export interface TableColumn<T> {
	key: Extract<keyof T, string>;
	/* An i18n key (lum.code, fault.status, ...), not literal text — every
	   column header goes through the same translation pipe as the rest of the
	   app rather than hardcoding one language into the config. */
	label: string;
	sortable?: boolean;
}

/* Purely presentational: columns are declared by the page that consumes this,
   never hardcoded here, so the same component serves every collection. */
@Component({
	selector: 'lumen-table',
	standalone: true,
	imports: [TranslocoDirective],
	templateUrl: './paginated-table.component.html'
})
export class PaginatedTableComponent<T extends { id: string }> {
	/* An i18n key for the caption, read by screen readers but never shown —
	   "code, street, lamp type..." on its own tells a sighted user nothing a
	   page heading hasn't already, but an unlabelled <table> tells an
	   assistive-tech user nothing at all. */
	@Input({ required: true }) caption = '';
	@Input({ required: true }) columns: TableColumn<T>[] = [];
	@Input() page: Page<T> | null = null;
	@Input() loading = false;
	/* A translation key ('table.error') rather than a rendered string, so the
	   message re-renders when the language changes without a refetch. */
	@Input() error: string | null = null;
	@Input() sortProperty: string | null = null;
	@Input() sortDirection: 'ASC' | 'DESC' = 'ASC';

	@Output() readonly sort = new EventEmitter<string>();
	@Output() readonly pageChange = new EventEmitter<number>();
	@Output() readonly perPageChange = new EventEmitter<number>();
	@Output() readonly rowSelected = new EventEmitter<T>();
	@Output() readonly retry = new EventEmitter<void>();

	readonly perPageOptions = [10, 20, 50, 100];

	rangeStart(): number {
		if (!this.page || this.page.total === 0) return 0;
		return (this.page.currentPage - 1) * this.page.perPage + 1;
	}

	rangeEnd(): number {
		if (!this.page) return 0;
		return Math.min(this.page.currentPage * this.page.perPage, this.page.total);
	}
}
