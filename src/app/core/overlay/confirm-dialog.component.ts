import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { MODAL_DATA, MODAL_REF, ModalRef, ModalService } from './modal.service';

export interface ConfirmDialogData {
	titleKey: string;
	bodyKey: string;
	confirmKey: string;
	cancelKey: string;
	params?: Record<string, unknown>;
}

@Component({
	selector: 'lumen-confirm-dialog',
	standalone: true,
	imports: [TranslocoDirective],
	template: `
		<div
			*transloco="let t"
			class="lum-modal lum-floating"
			role="alertdialog"
			aria-modal="true"
			[attr.aria-labelledby]="titleId"
			[attr.aria-describedby]="bodyId"
		>
			<h2 [id]="titleId" class="lum-modal__title">{{ t(data.titleKey) }}</h2>
			<p [id]="bodyId" class="lum-modal__body">{{ t(data.bodyKey, data.params) }}</p>
			<div class="lum-modal__actions">
				<button type="button" class="btn btn-outline-secondary" (click)="cancel()">
					{{ t(data.cancelKey) }}
				</button>
				<button type="button" class="btn btn-primary" (click)="confirm()">
					{{ t(data.confirmKey) }}
				</button>
			</div>
		</div>
	`
})
export class ConfirmDialogComponent {
	private readonly _ref = inject<ModalRef<boolean>>(MODAL_REF);
	public readonly data = inject<ConfirmDialogData>(MODAL_DATA);

	private static _nextId = 0;
	public readonly titleId = `confirm-dialog-title-${ConfirmDialogComponent._nextId++}`;
	public readonly bodyId = `${this.titleId}-body`;

	public confirm(): void {
		this._ref.close(true);
	}

	public cancel(): void {
		this._ref.close(false);
	}
}

/* The one place that opens a ConfirmDialogComponent - @Confirmable and the
   dirty-exit guard both call this rather than each wiring ModalService.open
   with their own defaults, so "declining" (backdrop click, Escape, or the
   cancel button) reads as `false` in exactly one place. */
export const confirmDialog = (modal: ModalService, data: ConfirmDialogData): Promise<boolean> =>
	modal
		.open<ConfirmDialogComponent, boolean>(ConfirmDialogComponent, data)
		.then((result) => !!result);
