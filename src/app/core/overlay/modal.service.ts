import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, InjectionToken, Injector, Type, inject } from '@angular/core';

/* What a component opened through the modal service can do to itself: close
   with (or without) a result. Nothing else — it never sees the OverlayRef. */
export interface ModalRef<R = unknown> {
	close(result?: R): void;
}

export const MODAL_REF = new InjectionToken<ModalRef>('MODAL_REF');
/* The per-open payload (e.g. a ConfirmDialogData), typed `unknown` at the
   token and narrowed by whatever component injects it. */
export const MODAL_DATA = new InjectionToken<unknown>('MODAL_DATA');

/* CDK Overlay wrapped into "open a component, get a Promise back" — the shape
 * every caller (the confirm dialog, the dirty-exit prompt, and eventually
 * anything else that needs a modal) actually wants, instead of wiring
 * OverlayRef/ComponentPortal/FocusTrap by hand at each call site.
 *
 * Backdrop click and Escape both resolve with `undefined`, exactly like a
 * dismissed native <dialog> — a caller that needs "no answer" to mean
 * something specific (the confirm dialog treats it as "cancelled") checks for
 * that itself rather than this service guessing on its behalf.
 */
@Injectable({ providedIn: 'root' })
export class ModalService {
	private readonly overlay = inject(Overlay);
	private readonly focusTrapFactory = inject(FocusTrapFactory);
	private readonly injector = inject(Injector);

	/* A handful of decorators (see @Confirmable) run outside any injection
	   context — they wrap a plain method on an arbitrary class, not a
	   constructor or a field initializer, so `inject()` is not available to
	   them. ModalService is a root singleton, so stashing the one instance
	   here is a narrow, deliberate exception to "always use DI": it lets the
	   decorator reach the same service every component gets, without every
	   consumer of @Confirmable having to expose a `modal` property under an
	   agreed name. */
	private static current: ModalService | null = null;

	static get instance(): ModalService {
		if (!ModalService.current) {
			throw new Error('ModalService used before Angular constructed it');
		}
		return ModalService.current;
	}

	constructor() {
		ModalService.current = this;
	}

	open<C, R = unknown>(component: Type<C>, data?: unknown): Promise<R | undefined> {
		return new Promise<R | undefined>((resolve) => {
			const previouslyFocused = document.activeElement as HTMLElement | null;

			const overlayRef = this.overlay.create({
				hasBackdrop: true,
				backdropClass: 'cdk-overlay-dark-backdrop',
				panelClass: 'lum-modal-panel',
				positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
				scrollStrategy: this.overlay.scrollStrategies.block()
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
				parent: this.injector,
				providers: [
					{ provide: MODAL_DATA, useValue: data },
					{ provide: MODAL_REF, useValue: modalRef }
				]
			});

			const componentRef = overlayRef.attach(new ComponentPortal(component, null, portalInjector));

			trap = this.focusTrapFactory.create(overlayRef.overlayElement);
			void trap.focusInitialElementWhenReady();

			overlayRef.backdropClick().subscribe(() => close(undefined));
			overlayRef.keydownEvents().subscribe((event) => {
				if (event.key === 'Escape') close(undefined);
			});

			/* A component that gets destroyed some other way (a hard navigation,
			   a test tearing down the fixture) must still resolve the promise
			   rather than leave the caller awaiting forever. */
			componentRef.onDestroy(() => close(undefined));
		});
	}
}
