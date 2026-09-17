import { AsyncPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@core/api/toast.service';
import { ModalService } from '@core/overlay/modal.service';
import { LumenTooltipDirective } from '@shared/directives/tooltip.directive';
import { PaginatedTableBase } from '@shared/components/paginated-table/paginated-table.base';
import {
	PaginatedTableComponent,
	TableColumn
} from '@shared/components/paginated-table/paginated-table.component';
import { CREW_SEARCH_KEYS, Crew, CrewService } from './crew.service';
import { editCrewDialog } from './edit-crew-dialog.component';

/* Same v1 (RxJS) base as work-orders - see docs/table-v1-vs-v2.md for why
   luminaires/faults are the deliberate v1/v2 comparison and everything else
   just picks v1.

   No "load" / open-orders-per-crew column here, even though crew.load and
   crew.openOrders exist in the i18n files: the backend has no endpoint that
   returns that count cheaply. GET /api/crews returns the crew shape only,
   and the only way to derive an open-order count per crew is
   POST /api/work-orders/paged filtered by crewId - one request per visible
   row, per page, forever. That's a real N+1, not a one-time cost, for a
   number this screen can live without; faking it from a single unfiltered
   fetch would silently go stale/wrong as soon as there's more than one page
   of work orders. Documented gap, not an oversight - see docs/table-v1-vs-v2.md
   companion note in the work-orders-and-crews PR description. */
@Component({
	selector: 'lumen-crews-page',
	standalone: true,
	imports: [AsyncPipe, TranslocoDirective, PaginatedTableComponent, LumenTooltipDirective],
	templateUrl: './crews-page.component.html'
})
export class CrewsPageComponent extends PaginatedTableBase<Crew> {
	protected readonly collection = inject(CrewService);
	private readonly auth = inject(AuthService);
	private readonly modal = inject(ModalService);
	private readonly toast = inject(ToastService);
	private readonly transloco = inject(TranslocoService);

	readonly abilities = this.auth.abilities;
	readonly hasRowActions = computed(() => this.abilities().editCrew);

	readonly columns: TableColumn<Crew>[] = [
		{ key: 'code', label: 'crew.code', sortable: true },
		{ key: 'name', label: 'crew.name', sortable: true },
		{ key: 'contractor', label: 'crew.contractor', sortable: true },
		{ key: 'members', label: 'crew.members', sortable: true },
		{ key: 'zone', label: 'crew.zone', sortable: true },
		{ key: 'shift', label: 'crew.shift', sortable: true }
	];

	readonly pillColumns = { shift: 'shift' };

	constructor() {
		super([...CREW_SEARCH_KEYS], { property: 'code', direction: 'ASC' });
	}

	editCrew(crew: Crew): void {
		void editCrewDialog(this.modal, { crew }).then((patch) => {
			if (!patch) return;
			this.collection.update(crew.id, patch).subscribe(() => {
				this.toast.show(this.transloco.translate('crew.updated', { code: crew.code }), 'healthy');
				this.refresh();
			});
		});
	}
}
