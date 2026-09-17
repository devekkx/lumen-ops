import { Component, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { MODAL_DATA, MODAL_REF, ModalRef, ModalService } from '@core/overlay/modal.service';
import { CONTRACTORS, Crew, CrewPatch, SHIFTS } from './crew.service';

export interface EditCrewDialogData {
	crew: Crew;
}

/* Editing in place, not create/delete - see crew.service.ts's update() for
   why. Zone and code are read-only here on purpose: this dialog corrects the
   roster details an ADMIN would actually need to fix (a rename, a contractor
   handover, a headcount or shift change), not the district a crew is based
   in, which is closer to a reassignment than an edit. */
@Component({
	selector: 'lumen-edit-crew-dialog',
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
				{{ t('crew.editTitle', { code: data.crew.code }) }}
			</h2>

			<label class="d-block mb-3">
				<span class="form-label">{{ t('crew.name') }}</span>
				<input
					class="form-control"
					type="text"
					[value]="name()"
					(input)="name.set($any($event.target).value)"
				/>
			</label>

			<label class="d-block mb-3">
				<span class="form-label">{{ t('crew.contractor') }}</span>
				<select class="form-select" (change)="contractor.set($any($event.target).value)">
					@for (option of contractors; track option) {
						<option [value]="option" [selected]="option === contractor()">{{ option }}</option>
					}
				</select>
			</label>

			<label class="d-block mb-3">
				<span class="form-label">{{ t('crew.members') }}</span>
				<input
					class="form-control"
					type="number"
					min="1"
					[value]="members()"
					(input)="members.set(+$any($event.target).value)"
				/>
			</label>

			<label class="d-block mb-3">
				<span class="form-label">{{ t('crew.shift') }}</span>
				<select class="form-select" (change)="shift.set($any($event.target).value)">
					@for (option of shifts; track option) {
						<option [value]="option" [selected]="option === shift()">
							{{ t('shift.' + option) }}
						</option>
					}
				</select>
			</label>

			<div class="lum-modal__actions">
				<button type="button" class="btn btn-outline-secondary" (click)="cancel()">
					{{ t('confirm.no') }}
				</button>
				<button
					type="button"
					class="btn btn-primary"
					[disabled]="!name().trim()"
					(click)="confirm()"
				>
					{{ t('crew.save') }}
				</button>
			</div>
		</div>
	`
})
export class EditCrewDialogComponent {
	private readonly _ref = inject<ModalRef<CrewPatch>>(MODAL_REF);
	readonly data = inject<EditCrewDialogData>(MODAL_DATA);

	private static _nextId = 0;
	readonly titleId = `edit-crew-dialog-title-${EditCrewDialogComponent._nextId++}`;

	readonly contractors = CONTRACTORS;
	readonly shifts = SHIFTS;

	readonly name = signal(this.data.crew.name);
	readonly contractor = signal(this.data.crew.contractor);
	readonly members = signal(this.data.crew.members);
	readonly shift = signal(this.data.crew.shift);

	confirm(): void {
		if (!this.name().trim()) return;
		this._ref.close({
			name: this.name().trim(),
			contractor: this.contractor(),
			members: this.members(),
			shift: this.shift()
		});
	}

	cancel(): void {
		this._ref.close();
	}
}

/* The one place that opens an EditCrewDialogComponent, mirroring
   assignCrewDialog() - resolves with the edited fields, or undefined if the
   dialog was dismissed without saving. */
export const editCrewDialog = (
	modal: ModalService,
	data: EditCrewDialogData
): Promise<CrewPatch | undefined> =>
	modal.open<EditCrewDialogComponent, CrewPatch>(EditCrewDialogComponent, data);
