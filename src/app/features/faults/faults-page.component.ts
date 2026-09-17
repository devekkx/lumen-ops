import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/api/toast.service';
import { Confirmable } from '@shared/decorators/confirmable.decorator';
import { LumenTooltipDirective } from '@shared/directives/tooltip.directive';
import {
	PaginatedTableComponent,
	TableColumn
} from '@shared/components/paginated-table/paginated-table.component';
import { PaginatedTableBaseV2 } from '@shared/v2/paginated-table.base';
import { FilterRecord } from '@shared/models/filter';
import { downloadCsv, toCsv } from '@shared/utils/csv';
import {
	FAULT_SEARCH_KEYS,
	FAULT_STATUSES,
	Fault,
	FaultService,
	SEVERITIES
} from './fault.service';

/* Migrated to the v2 (signal + resource()) base - see docs/table-v1-vs-v2.md. Luminaires stays on v1
   deliberately, so both are live side by side as the comparison. */
@Component({
	selector: 'lumen-faults-page',
	standalone: true,
	imports: [TranslocoDirective, RouterLink, PaginatedTableComponent, LumenTooltipDirective],
	templateUrl: './faults-page.component.html'
})
export class FaultsPageComponent extends PaginatedTableBaseV2<Fault> {
	protected readonly collection = inject(FaultService);
	private readonly auth = inject(AuthService);
	private readonly toast = inject(ToastService);
	private readonly transloco = inject(TranslocoService);

	readonly abilities = this.auth.abilities;

	/* Every write action is individually ability-gated inside #rowActions
	   already, but that leaves an empty Actions column for a read-only user
	   - the header still renders, the cell is just blank. This gates the
	   whole projected template so the column doesn't exist at all unless
	   there is at least one action it could ever show. */
	readonly hasRowActions = computed(() => {
		const abilities = this.abilities();
		return (
			abilities.editFault ||
			abilities.validateFault ||
			abilities.rejectFault ||
			abilities.closeFault ||
			abilities.deleteFault
		);
	});

	readonly columns: TableColumn<Fault>[] = [
		{ key: 'code', label: 'fault.code', sortable: true },
		{ key: 'luminaireCode', label: 'fault.luminaire', sortable: true },
		{ key: 'severity', label: 'fault.severity', sortable: true },
		{ key: 'status', label: 'fault.status', sortable: true },
		{ key: 'reportedBy', label: 'fault.reportedBy', sortable: true },
		{ key: 'reportedAt', label: 'fault.reportedAt', sortable: true },
		{ key: 'dueAt', label: 'fault.dueAt', sortable: true }
	];

	readonly pillColumns = { severity: 'severity', status: 'status' };
	readonly dateColumns = ['reportedAt', 'dueAt'];

	readonly severities = SEVERITIES;
	readonly statuses = FAULT_STATUSES;

	private severityFilter: string[] = [];
	private statusFilter: string[] = [];

	constructor() {
		super([...FAULT_SEARCH_KEYS], { property: 'reportedAt', direction: 'DESC' });
	}

	toggleSeverity(value: string, checked: boolean): void {
		this.severityFilter = checked
			? [...this.severityFilter, value]
			: this.severityFilter.filter((entry) => entry !== value);
		this.applyFilters();
	}

	toggleStatus(value: string, checked: boolean): void {
		this.statusFilter = checked
			? [...this.statusFilter, value]
			: this.statusFilter.filter((entry) => entry !== value);
		this.applyFilters();
	}

	isSeverityOn(value: string): boolean {
		return this.severityFilter.includes(value);
	}

	isStatusOn(value: string): boolean {
		return this.statusFilter.includes(value);
	}

	canValidate(fault: Fault): boolean {
		return this.abilities().validateFault && fault.status === 'REPORTED';
	}

	canReject(fault: Fault): boolean {
		return this.abilities().rejectFault && fault.status === 'REPORTED';
	}

	canClose(fault: Fault): boolean {
		const closeable = fault.status === 'VALIDATED' || fault.status === 'IN_PROGRESS';
		return this.abilities().closeFault && closeable;
	}

	rejectFault(fault: Fault): void {
		this.collection.transition(fault.id, 'REJECTED').subscribe(() => {
			this.toast.show(
				this.transloco.translate('fault.rejected', { code: fault.code }),
				'attention'
			);
			this.refresh();
		});
	}

	@Confirmable('confirm.validateFault', { params: (fault: Fault) => ({ code: fault.code }) })
	validateFault(fault: Fault): void {
		this.collection.transition(fault.id, 'VALIDATED').subscribe(() => {
			this.toast.show(this.transloco.translate('fault.validated', { code: fault.code }), 'healthy');
			this.refresh();
		});
	}

	@Confirmable('confirm.closeFault', { params: (fault: Fault) => ({ code: fault.code }) })
	closeFault(fault: Fault): void {
		this.collection.transition(fault.id, 'CLOSED').subscribe(() => {
			this.toast.show(this.transloco.translate('fault.closedMsg', { code: fault.code }), 'healthy');
			this.refresh();
		});
	}

	@Confirmable('confirm.deleteFault', { params: (fault: Fault) => ({ code: fault.code }) })
	deleteFault(fault: Fault): void {
		this.collection.delete(fault.id).subscribe(() => {
			this.toast.show(this.transloco.translate('fault.deleted', { code: fault.code }), 'critical');
			this.refresh();
		});
	}

	/* Exports the page currently on screen, not the whole collection - see
	   shared/utils/csv.ts for why. Column headers come from the same
	   TableColumn config the table itself renders, translated at export
	   time, so a CSV column always matches the header the person exporting
	   was actually looking at. */
	exportCsv(): void {
		const columns = this.columns.map((column) => ({
			key: column.key,
			header: this.transloco.translate(column.label)
		}));
		const rows = this.page().data;
		downloadCsv(`averias-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(columns, rows));
	}

	private applyFilters(): void {
		const record: FilterRecord = {};
		if (this.severityFilter.length) record['severity'] = this.severityFilter;
		if (this.statusFilter.length) record['status'] = this.statusFilter;
		this.setFilters(record);
	}
}
