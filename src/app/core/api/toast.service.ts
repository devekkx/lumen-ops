import { Injectable, signal } from '@angular/core';
import { StatusTone } from '@shared/models/status-tone';

/* Reuses the app's one tone vocabulary rather than inventing a
   success/warning/error trio - a toast's dot is the same "what does this
   mean" colour as a status pill anywhere else in the app. */
export type ToastTone = StatusTone;

export interface Toast {
	id: number;
	message: string;
	tone: ToastTone;
}

const DEFAULT_DURATION_MS = 5000;

/* A cascade of identical failures - every request in an offline batch
   rejecting with the same "no connection" message - must read as one toast,
   not one per request. This is the difference between an interceptor that
   is useful and one that spams the corner of the screen. */
@Injectable({ providedIn: 'root' })
export class ToastService {
	private nextId = 0;
	private readonly toastsState = signal<Toast[]>([]);

	readonly toasts = this.toastsState.asReadonly();

	show(message: string, tone: ToastTone = 'neutral', durationMs = DEFAULT_DURATION_MS): void {
		if (this.toastsState().some((toast) => toast.message === message && toast.tone === tone)) {
			return;
		}

		const id = ++this.nextId;
		this.toastsState.update((toasts) => [...toasts, { id, message, tone }]);
		setTimeout(() => this.dismiss(id), durationMs);
	}

	dismiss(id: number): void {
		this.toastsState.update((toasts) => toasts.filter((toast) => toast.id !== id));
	}
}
