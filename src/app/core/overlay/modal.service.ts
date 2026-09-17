import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, InjectionToken, Injector, Type, inject } from '@angular/core';

export interface ModalRef<R = unknown> {
	close(result?: R): void;
}

export const MODAL_REF = new InjectionToken<ModalRef>('MODAL_REF');
export const MODAL_DATA = new InjectionToken<unknown>('MODAL_DATA');

@Injectable({ providedIn: 'root' })
export class ModalService {
	private readonly _overlay = inject(Overlay);
	private readonly _focusTrapFactory = inject(FocusTrapFactory);
	private readonly _injector = inject(Injector);

	private static _current: ModalService | null = null;

	static get instance(): ModalService {
		if (!ModalService._current) {
			throw new Error('ModalService used before Angular constructed it');
		}
		return ModalService._current;
	}

	constructor() {
		ModalService._current = this;
	}

	open<C, R = unknown>(component: Type<C>, data?: unknown): Promise<R | undefined> {
		return new Promise<R | undefined>((resolve) => {
			const previouslyFocused = document.activeElement as HTMLElement | null;

			const overlayRef = this._overlay.create({
				hasBackdrop: true,
				backdropClass: 'cdk-overlay-dark-backdrop',
				panelClass: 'lum-modal-panel',
				positionStrategy: this._overlay.position().global().centerHorizontally().centerVertically(),
				scrollStrategy: this._overlay.scrollStrategies.block()
			});

			let trap: FocusTrap | null = null;
			let settled = false;

			const close = (result?: R): void => {
				if (settled) return;
				settled = true;
				trap?.destroy();
				overlayRef.dispose();
				previouslyFocused?.focus();
				resolve(result);
			};

			const modalRef: ModalRef<R> = { close };

			const portalInjector = Injector.create({
				parent: this._injector,
				providers: [
					{ provide: MODAL_DATA, useValue: data },
					{ provide: MODAL_REF, useValue: modalRef }
				]
			});

			const componentRef = overlayRef.attach(new ComponentPortal(component, null, portalInjector));

			trap = this._focusTrapFactory.create(overlayRef.overlayElement);
			void trap.focusInitialElementWhenReady();

			overlayRef.backdropClick().subscribe(() => close());
			overlayRef.keydownEvents().subscribe((event) => {
				if (event.key === 'Escape') close();
			});

			componentRef.onDestroy(() => close());
		});
	}
}
