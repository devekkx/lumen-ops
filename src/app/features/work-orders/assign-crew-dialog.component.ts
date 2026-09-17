import { Component, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { MODAL_DATA, MODAL_REF, ModalRef, ModalService } from '@core/overlay/modal.service';
import { Crew } from '../crews/crew.service';

export interface AssignCrewDialogData {
	code: string;
	crews: readonly Crew[];
}

@Component({
	selector: 'lumen-assign-crew-dialog',
	standalone: true,
	imports: [TranslocoDirective],
	template: `
		<div
			*transloco="let t"
			class="lum-modal lum-floating"
			role="dialog"
			aria-modal="true"
			[attr.aria-labelledby]="titleId"
		>
			<h2 [id]="titleId" class="lum-modal__title">
				{{ t('order.assignTitle', { code: data.code }) }}
			</h2>
			<label class="d-block mb-3">
				<span class="form-label">{{ t('order.crew') }}</span>
				<select class="form-select" (change)="selected.set($any($event.target).value)">
					<option value="">{{ t('order.unassigned') }}</option>
					@for (crew of data.crews; track crew.id) {
						<option [value]="crew.id">{{ crew.code }} · {{ crew.name }}</option>
					}
				</select>
			</label>
			<div class="lum-modal__actions">
				<button type="button" class="btn btn-outline-secondary" (click)="cancel()">
					{{ t('confirm.no') }}
				</button>
				<button type="button" class="btn btn-primary" [disabled]="!selected()" (click)="confirm()">
					{{ t('order.assign') }}
				</button>
			</div>
		</div>
	`
})
export class AssignCrewDialogComponent {
	private readonly _ref = inject<ModalRef<string>>(MODAL_REF);
	readonly data = inject<AssignCrewDialogData>(MODAL_DATA);

	private static _nextId = 0;
	readonly titleId = `assign-crew-dialog-title-${AssignCrewDialogComponent._nextId++}`;

	readonly selected = signal('');

	confirm(): void {
		if (this.selected()) this._ref.close(this.selected());
	}

	cancel(): void {
		this._ref.close();
	}
}

/* The one place that opens an AssignCrewDialogComponent, mirroring
   confirmDialog() in confirm-dialog.component.ts - resolves with the chosen
   crew id, or undefined if the picker was dismissed without one. */
export const assignCrewDialog = (
	modal: ModalService,
	data: AssignCrewDialogData
): Promise<string | undefined> =>
	modal.open<AssignCrewDialogComponent, string>(AssignCrewDialogComponent, data);
