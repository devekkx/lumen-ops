import { Component, inject } from '@angular/core';
import { ToastService } from '@core/api/toast.service';

@Component({
	selector: 'lumen-toast-host',
	standalone: true,
	template: `
		<div class="lum-toast-stack" role="status" aria-live="polite">
			@for (toast of toasts(); track toast.id) {
				<div class="lum-toast">
					<span
						class="lum-toast__dot"
						[style.background]="'var(--tone-' + toast.tone + '-ink)'"
					></span>
					<p class="lum-toast__body">{{ toast.message }}</p>
					<button
						type="button"
						class="lum-toast__close"
						aria-label="Dismiss"
						(click)="dismiss(toast.id)"
					>
						×
					</button>
				</div>
			}
		</div>
	`
})
export class ToastHostComponent {
	private readonly _toastService = inject(ToastService);
	readonly toasts = this._toastService.toasts;

	dismiss(id: number): void {
		this._toastService.dismiss(id);
	}
}
