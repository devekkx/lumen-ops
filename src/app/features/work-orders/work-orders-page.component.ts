import { AsyncPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { map, take } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/api/toast.service';
import { ModalService } from '@core/overlay/modal.service';
import { Confirmable } from '@shared/decorators/confirmable.decorator';
import { PaginatedTableBase } from '@shared/components/paginated-table/paginated-table.base';
import {
	PaginatedTableComponent,
	TableColumn
} from '@shared/components/paginated-table/paginated-table.component';
import { FilterRecord } from '@shared/models/filter';
import { LumenTooltipDirective } from '@shared/directives/tooltip.directive';
import { downloadCsv, toCsv } from '@shared/utils/csv';
import { CrewService } from '../crews/crew.service';
import { assignCrewDialog } from './assign-crew-dialog.component';
import {
	ORDER_STATUSES,
	WORK_ORDER_SEARCH_KEYS,
	WorkOrder,
	WorkOrderService
} from './work-order.service';

@Component({
	selector: 'lumen-work-orders-page',
	standalone: true,
	imports: [AsyncPipe, TranslocoDirective, PaginatedTableComponent, LumenTooltipDirective],
	templateUrl: './work-orders-page.component.html'
})
export class WorkOrdersPageComponent extends PaginatedTableBase<WorkOrder> {
	protected readonly collection = inject(WorkOrderService);
	private readonly _crews = inject(CrewService);
	private readonly _auth = inject(AuthService);
	private readonly _modal = inject(ModalService);
	private readonly _toast = inject(ToastService);
	private readonly _transloco = inject(TranslocoService);

	public readonly abilities = this._auth.abilities;

	public readonly hasRowActions = computed(() => {
		const abilities = this.abilities();
		return abilities.assignCrew || abilities.startOrder || abilities.completeOrder;
	});

	private static readonly _BASE_COLUMNS: TableColumn<WorkOrder>[] = [
		{ key: 'code', label: 'order.code', sortable: true },
		{ key: 'faultCode', label: 'order.fault', sortable: true },
		{ key: 'luminaireCode', label: 'lum.title', sortable: true },
		{ key: 'severity', label: 'fault.severity', sortable: true },
		{ key: 'crewName', label: 'order.crew', sortable: true },
		{ key: 'status', label: 'order.status', sortable: true },
		{ key: 'scheduledAt', label: 'order.scheduledAt', sortable: true },
		{ key: 'hours', label: 'order.hours', sortable: true }
	];

	private static readonly _COST_COLUMN: TableColumn<WorkOrder> = {
		key: 'cost',
		label: 'order.cost',
		sortable: true
	};

	public readonly columns = computed<TableColumn<WorkOrder>[]>(() =>
		this.abilities().seeCosts
			? [...WorkOrdersPageComponent._BASE_COLUMNS, WorkOrdersPageComponent._COST_COLUMN]
			: WorkOrdersPageComponent._BASE_COLUMNS
	);

	public readonly pillColumns = { severity: 'severity', status: 'status' };
	public readonly dateColumns = ['scheduledAt'];

	public readonly statuses = ORDER_STATUSES;

	private _statusFilter: string[] = [];

	public readonly displayPage$ = this.page$.pipe(
		map((page) => ({
			...page,
			data: page.data.map((order) => ({
				...order,
				crewName: order.crewName ?? this._transloco.translate('order.unassigned')
			}))
		}))
	);

	constructor() {
		super([...WORK_ORDER_SEARCH_KEYS], { property: 'scheduledAt', direction: 'ASC' });
	}

	public toggleStatus(value: string, checked: boolean): void {
		this._statusFilter = checked
			? [...this._statusFilter, value]
			: this._statusFilter.filter((entry) => entry !== value);
		this._applyFilters();
	}

	public isStatusOn(value: string): boolean {
		return this._statusFilter.includes(value);
	}

	public canAssign(order: WorkOrder): boolean {
		return this.abilities().assignCrew && order.status !== 'DONE';
	}

	public canStart(order: WorkOrder): boolean {
		return this.abilities().startOrder && order.status === 'ASSIGNED';
	}

	public canComplete(order: WorkOrder): boolean {
		return this.abilities().completeOrder && order.status === 'IN_PROGRESS';
	}

	/* Fetches the full crew list fresh each time rather than caching it on the
	   component - crews rarely change, but the picker should never offer a
	   list that's gone stale across a long-lived session, and this page has
	   nowhere better to invalidate a cache from. */
	public assignCrew(order: WorkOrder): void {
		this._crews.list().subscribe((crews) => {
			void assignCrewDialog(this._modal, { code: order.code, crews }).then((crewId) => {
				if (!crewId) return;
				this.collection.assignCrew(order.id, crewId).subscribe((updated) => {
					this._toast.show(
						this._transloco.translate('order.assigned', {
							code: order.code,
							crew: updated.crewName
						}),
						'healthy'
					);
					this.refresh();
				});
			});
		});
	}

	public startOrder(order: WorkOrder): void {
		this.collection.updateStatus(order.id, 'IN_PROGRESS').subscribe(() => {
			this._toast.show(this._transloco.translate('order.started', { code: order.code }), 'queued');
			this.refresh();
		});
	}

	@Confirmable('confirm.completeOrder', { params: (order: WorkOrder) => ({ code: order.code }) })
	public completeOrder(order: WorkOrder): void {
		this.collection.updateStatus(order.id, 'DONE').subscribe(() => {
			this._toast.show(
				this._transloco.translate('order.completed', { code: order.code }),
				'healthy'
			);
			this.refresh();
		});
	}

	/* Reads displayPage$'s already-cached last emission (take(1) on a
	   shareReplay source, not a new request) rather than the raw page$ -
	   exporting the crew names actually on screen, "Unassigned" included,
	   instead of the null the wire sends for one. */
	public exportCsv(): void {
		this.displayPage$.pipe(take(1)).subscribe((page) => {
			const columns = this.columns().map((column) => ({
				key: column.key,
				header: this._transloco.translate(column.label)
			}));
			downloadCsv(
				`ordenes-trabajo-${new Date().toISOString().slice(0, 10)}.csv`,
				toCsv(columns, page.data)
			);
		});
	}

	private _applyFilters(): void {
		const record: FilterRecord = {};
		if (this._statusFilter.length) record['status'] = this._statusFilter;
		this.setFilters(record);
	}
}
