import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/api/toast.service';
import { Confirmable } from '@shared/decorators/confirmable.decorator';
import { LumenTooltipDirective } from '@shared/directives/tooltip.directive';
import {
	FilterDropdownComponent,
	FilterToggleEvent
} from '@shared/components/filter-dropdown/filter-dropdown.component';
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

@Component({
	selector: 'lumen-faults-page',
	standalone: true,
	imports: [
		TranslocoDirective,
		RouterLink,
		PaginatedTableComponent,
		LumenTooltipDirective,
		FilterDropdownComponent
	],
	templateUrl: './faults-page.component.html'
})
export class FaultsPageComponent extends PaginatedTableBaseV2<Fault> {
	protected readonly collection = inject(FaultService);
	private readonly _auth = inject(AuthService);
	private readonly _toast = inject(ToastService);
	private readonly _transloco = inject(TranslocoService);

	public readonly abilities = this._auth.abilities;

	public readonly hasRowActions = computed(() => {
		const abilities = this.abilities();
		return (
			abilities.editFault ||
			abilities.validateFault ||
			abilities.rejectFault ||
			abilities.closeFault ||
			abilities.deleteFault
		);
	});

	public readonly columns: TableColumn<Fault>[] = [
		{ key: 'code', label: 'fault.code', sortable: true },
		{ key: 'luminaireCode', label: 'fault.luminaire', sortable: true },
		{ key: 'severity', label: 'fault.severity', sortable: true },
		{ key: 'status', label: 'fault.status', sortable: true },
		{ key: 'reportedBy', label: 'fault.reportedBy', sortable: true },
		{ key: 'reportedAt', label: 'fault.reportedAt', sortable: true },
		{ key: 'dueAt', label: 'fault.dueAt', sortable: true }
	];

	public readonly pillColumns = { severity: 'severity', status: 'status' };
	public readonly dateColumns = ['reportedAt', 'dueAt'];

	public readonly severities = SEVERITIES;
	public readonly statuses = FAULT_STATUSES;

	private _severityFilter: string[] = [];
	private _statusFilter: string[] = [];

	public get severityFilter(): readonly string[] {
		return this._severityFilter;
	}

	public get statusFilter(): readonly string[] {
		return this._statusFilter;
	}

	constructor() {
		super([...FAULT_SEARCH_KEYS], { property: 'reportedAt', direction: 'DESC' });
	}

	public toggleSeverity({ value, checked }: FilterToggleEvent): void {
		this._severityFilter = checked
			? [...this._severityFilter, value]
			: this._severityFilter.filter((entry) => entry !== value);
		this._applyFilters();
	}

	public toggleStatus({ value, checked }: FilterToggleEvent): void {
		this._statusFilter = checked
			? [...this._statusFilter, value]
			: this._statusFilter.filter((entry) => entry !== value);
		this._applyFilters();
	}

	public canValidate(fault: Fault): boolean {
		return this.abilities().validateFault && fault.status === 'REPORTED';
	}

	public canReject(fault: Fault): boolean {
		return this.abilities().rejectFault && fault.status === 'REPORTED';
	}

	public canClose(fault: Fault): boolean {
		const closeable = fault.status === 'VALIDATED' || fault.status === 'IN_PROGRESS';
		return this.abilities().closeFault && closeable;
	}

	public rejectFault(fault: Fault): void {
		this.collection.transition(fault.id, 'REJECTED').subscribe(() => {
			this._toast.show(
				this._transloco.translate('fault.rejected', { code: fault.code }),
				'attention'
			);
			this.refresh();
		});
	}

	@Confirmable('confirm.validateFault', { params: (fault: Fault) => ({ code: fault.code }) })
	public validateFault(fault: Fault): void {
		this.collection.transition(fault.id, 'VALIDATED').subscribe(() => {
			this._toast.show(
				this._transloco.translate('fault.validated', { code: fault.code }),
				'healthy'
			);
			this.refresh();
		});
	}

	@Confirmable('confirm.closeFault', { params: (fault: Fault) => ({ code: fault.code }) })
	public closeFault(fault: Fault): void {
		this.collection.transition(fault.id, 'CLOSED').subscribe(() => {
			this._toast.show(
				this._transloco.translate('fault.closedMsg', { code: fault.code }),
				'healthy'
			);
			this.refresh();
		});
	}

	@Confirmable('confirm.deleteFault', { params: (fault: Fault) => ({ code: fault.code }) })
	public deleteFault(fault: Fault): void {
		this.collection.delete(fault.id).subscribe(() => {
			this._toast.show(
				this._transloco.translate('fault.deleted', { code: fault.code }),
				'critical'
			);
			this.refresh();
		});
	}

	/* Exports the page currently on screen, not the whole collection - see
	   shared/utils/csv.ts for why. Column headers come from the same
	   TableColumn config the table itself renders, translated at export
	   time, so a CSV column always matches the header the person exporting
	   was actually looking at. */
	public exportCsv(): void {
		const columns = this.columns.map((column) => ({
			key: column.key,
			header: this._transloco.translate(column.label)
		}));
		const rows = this.page().data;
		downloadCsv(`averias-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(columns, rows));
	}

	private _applyFilters(): void {
		const record: FilterRecord = {};
		if (this._severityFilter.length) record['severity'] = this._severityFilter;
		if (this._statusFilter.length) record['status'] = this._statusFilter;
		this.setFilters(record);
	}
}
