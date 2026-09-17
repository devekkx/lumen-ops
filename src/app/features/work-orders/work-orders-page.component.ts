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

/* Same v1 (RxJS) base as luminaires - see docs/table-v1-vs-v2.md. Work orders
   and crews are not part of that deliberate v1/v2 comparison (only luminaires
   and faults are), so there is no reason to pick the newer base here. */
@Component({
	selector: 'lumen-work-orders-page',
	standalone: true,
	imports: [AsyncPipe, TranslocoDirective, PaginatedTableComponent, LumenTooltipDirective],
	templateUrl: './work-orders-page.component.html'
})
export class WorkOrdersPageComponent extends PaginatedTableBase<WorkOrder> {
	protected readonly collection = inject(WorkOrderService);
	private readonly crews = inject(CrewService);
	private readonly auth = inject(AuthService);
	private readonly modal = inject(ModalService);
	private readonly toast = inject(ToastService);
	private readonly transloco = inject(TranslocoService);

	readonly abilities = this.auth.abilities;

	/* Same reasoning as faults-page's hasRowActions: every write action below
	   is individually ability-gated, but that still leaves an empty Actions
	   column for a CONTRACTOR-scoped VIEWER-like session (there isn't one
	   today - ordenes-trabajo is CONTRACTOR/ADMIN-only - but the column
	   shouldn't silently exist for nobody if that ever changes). */
	readonly hasRowActions = computed(() => {
		const abilities = this.abilities();
		return abilities.assignCrew || abilities.startOrder || abilities.completeOrder;
	});

	private static readonly BASE_COLUMNS: TableColumn<WorkOrder>[] = [
		{ key: 'code', label: 'order.code', sortable: true },
		{ key: 'faultCode', label: 'order.fault', sortable: true },
		{ key: 'luminaireCode', label: 'lum.title', sortable: true },
		{ key: 'severity', label: 'fault.severity', sortable: true },
		{ key: 'crewName', label: 'order.crew', sortable: true },
		{ key: 'status', label: 'order.status', sortable: true },
		{ key: 'scheduledAt', label: 'order.scheduledAt', sortable: true },
		{ key: 'hours', label: 'order.hours', sortable: true }
	];

	private static readonly COST_COLUMN: TableColumn<WorkOrder> = {
		key: 'cost',
		label: 'order.cost',
		sortable: true
	};

	/* The one place `seeCosts` actually does something: this page is the only
	   thing that shows a cost, and only CONTRACTOR/ADMIN ever reach it at
	   all, so the ability is defined to include contractor here rather than
	   hidden behind a column nobody who currently uses this screen would
	   ever see again. */
	readonly columns = computed<TableColumn<WorkOrder>[]>(() =>
		this.abilities().seeCosts
			? [...WorkOrdersPageComponent.BASE_COLUMNS, WorkOrdersPageComponent.COST_COLUMN]
			: WorkOrdersPageComponent.BASE_COLUMNS
	);

	readonly pillColumns = { severity: 'severity', status: 'status' };
	readonly dateColumns = ['scheduledAt'];

	readonly statuses = ORDER_STATUSES;

	private statusFilter: string[] = [];

	/* The base's page$ carries the raw wire value for crewName - null on a
	   DRAFT order. The table renders a column's value with a plain
	   interpolation (see paginated-table.component.html), which would just be
	   blank for null rather than saying anything, so this substitutes the
	   translated placeholder before the page ever reaches the table. Built
	   once per emission with the language active at fetch time - the same
	   level of reactivity the rest of the app gives one-off translated text
	   (e.g. the toasts on the faults page), not a live re-translation on a
	   language switch after the fact. */
	readonly displayPage$ = this.page$.pipe(
		map((page) => ({
			...page,
			data: page.data.map((order) => ({
				...order,
				crewName: order.crewName ?? this.transloco.translate('order.unassigned')
			}))
		}))
	);

	constructor() {
		super([...WORK_ORDER_SEARCH_KEYS], { property: 'scheduledAt', direction: 'ASC' });
	}

	toggleStatus(value: string, checked: boolean): void {
		this.statusFilter = checked
			? [...this.statusFilter, value]
			: this.statusFilter.filter((entry) => entry !== value);
		this.applyFilters();
	}

	isStatusOn(value: string): boolean {
		return this.statusFilter.includes(value);
	}

	canAssign(order: WorkOrder): boolean {
		return this.abilities().assignCrew && order.status !== 'DONE';
	}

	canStart(order: WorkOrder): boolean {
		return this.abilities().startOrder && order.status === 'ASSIGNED';
	}

	canComplete(order: WorkOrder): boolean {
		return this.abilities().completeOrder && order.status === 'IN_PROGRESS';
	}

	/* Fetches the full crew list fresh each time rather than caching it on the
	   component - crews rarely change, but the picker should never offer a
	   list that's gone stale across a long-lived session, and this page has
	   nowhere better to invalidate a cache from. */
	assignCrew(order: WorkOrder): void {
		this.crews.list().subscribe((crews) => {
			void assignCrewDialog(this.modal, { code: order.code, crews }).then((crewId) => {
				if (!crewId) return;
				this.collection.assignCrew(order.id, crewId).subscribe((updated) => {
					this.toast.show(
						this.transloco.translate('order.assigned', {
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

	startOrder(order: WorkOrder): void {
		this.collection.updateStatus(order.id, 'IN_PROGRESS').subscribe(() => {
			this.toast.show(this.transloco.translate('order.started', { code: order.code }), 'queued');
			this.refresh();
		});
	}

	@Confirmable('confirm.completeOrder', { params: (order: WorkOrder) => ({ code: order.code }) })
	completeOrder(order: WorkOrder): void {
		this.collection.updateStatus(order.id, 'DONE').subscribe(() => {
			this.toast.show(this.transloco.translate('order.completed', { code: order.code }), 'healthy');
			this.refresh();
		});
	}

	/* Reads displayPage$'s already-cached last emission (take(1) on a
	   shareReplay source, not a new request) rather than the raw page$ -
	   exporting the crew names actually on screen, "Unassigned" included,
	   instead of the null the wire sends for one. */
	exportCsv(): void {
		this.displayPage$.pipe(take(1)).subscribe((page) => {
			const columns = this.columns().map((column) => ({
				key: column.key,
				header: this.transloco.translate(column.label)
			}));
			downloadCsv(
				`ordenes-trabajo-${new Date().toISOString().slice(0, 10)}.csv`,
				toCsv(columns, page.data)
			);
		});
	}

	private applyFilters(): void {
		const record: FilterRecord = {};
		if (this.statusFilter.length) record['status'] = this.statusFilter;
		this.setFilters(record);
	}
}
