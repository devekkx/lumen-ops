import { Injectable, signal } from '@angular/core';
import { StatusTone } from '@shared/models/status-tone';

export type ToastTone = StatusTone;

export interface Toast {
	id: number;
	message: string;
	tone: ToastTone;
}

const DEFAULT_DURATION_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ToastService {
	private _nextId = 0;
	private readonly _toastsState = signal<Toast[]>([]);

	readonly toasts = this._toastsState.asReadonly();

	show(message: string, tone: ToastTone = 'neutral', durationMs = DEFAULT_DURATION_MS): void {
		if (this._toastsState().some((toast) => toast.message === message && toast.tone === tone)) {
			return;
		}

		const id = ++this._nextId;
		this._toastsState.update((toasts) => [...toasts, { id, message, tone }]);
		setTimeout(() => this.dismiss(id), durationMs);
	}

	dismiss(id: number): void {
		this._toastsState.update((toasts) => toasts.filter((toast) => toast.id !== id));
	}
}
