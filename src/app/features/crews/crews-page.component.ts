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

@Component({
	selector: 'lumen-crews-page',
	standalone: true,
	imports: [AsyncPipe, TranslocoDirective, PaginatedTableComponent, LumenTooltipDirective],
	templateUrl: './crews-page.component.html'
})
export class CrewsPageComponent extends PaginatedTableBase<Crew> {
	protected readonly collection = inject(CrewService);
	private readonly _auth = inject(AuthService);
	private readonly _modal = inject(ModalService);
	private readonly _toast = inject(ToastService);
	private readonly _transloco = inject(TranslocoService);

	readonly abilities = this._auth.abilities;
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
		void editCrewDialog(this._modal, { crew }).then((patch) => {
			if (!patch) return;
			this.collection.update(crew.id, patch).subscribe(() => {
				this._toast.show(this._transloco.translate('crew.updated', { code: crew.code }), 'healthy');
				this.refresh();
			});
		});
	}
}
