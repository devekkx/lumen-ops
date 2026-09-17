import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ApiService } from '@core/api/api.service';
import { ToastService } from '@core/api/toast.service';
import { Confirmable } from '@shared/decorators/confirmable.decorator';

interface DiagnosticsTraps {
	always500LuminaireId: string;
	slowPath: string;
}

@Component({
	selector: 'lumen-diagnostics-page',
	standalone: true,
	imports: [TranslocoDirective],
	templateUrl: './diagnostics-page.component.html'
})
export class DiagnosticsPageComponent implements OnInit {
	private readonly _api = inject(ApiService);
	private readonly _toast = inject(ToastService);
	private readonly _transloco = inject(TranslocoService);

	readonly traps = signal<DiagnosticsTraps | null>(null);
	readonly callingTrap = signal(false);
	readonly callingSlow = signal(false);

	ngOnInit(): void {
		this._api
			.get<DiagnosticsTraps>('/api/diagnostics/traps')
			.subscribe((traps) => this.traps.set(traps));
	}

	/* Always fails, by design - the api-error interceptor already surfaces
	   the translated 500 toast on its own, so there is nothing more useful
	   to do with the error here than let the interceptor's own toast be the
	   result the person clicking this button sees. */
	callTrap(): void {
		const traps = this.traps();
		if (!traps) return;
		this.callingTrap.set(true);
		this._api.get(`/api/luminaires/${traps.always500LuminaireId}`).subscribe({
			error: () => this.callingTrap.set(false),
			complete: () => this.callingTrap.set(false)
		});
	}

	callSlow(): void {
		const traps = this.traps();
		if (!traps) return;
		this.callingSlow.set(true);
		this._api.get<{ ok: boolean; tookMs: number }>(traps.slowPath).subscribe({
			next: (result) => {
				this._toast.show(
					this._transloco.translate('diag.slowDone', { ms: result.tookMs }),
					'healthy'
				);
			},
			complete: () => this.callingSlow.set(false)
		});
	}

	@Confirmable('confirm.resetDiagnostics')
	reset(): void {
		this._api.post<{ ok: boolean }>('/api/diagnostics/reset', {}).subscribe(() => {
			this._toast.show(this._transloco.translate('diag.resetDone'), 'healthy');
		});
	}
}
