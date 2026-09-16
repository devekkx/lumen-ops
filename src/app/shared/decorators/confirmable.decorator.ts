import { ConfirmDialogData, confirmDialog } from '@core/overlay/confirm-dialog.component';
import { ModalService } from '@core/overlay/modal.service';

export interface ConfirmableOptions<A extends unknown[]> {
	titleKey?: string;
	confirmKey?: string;
	cancelKey?: string;
	/* Builds the transloco interpolation params (e.g. { code: fault.code })
	   from whatever the decorated method was called with - `messageKey` is a
	   fixed i18n key ('confirm.deleteFault'), so the {code} inside it has to
	   come from the call site rather than from the decorator declaration. */
	params?: (...args: A) => Record<string, unknown>;
}

/* Wraps a method so it opens the confirm modal before running, and never runs
 * at all if the user declines.
 *
 * A method decorator has no constructor and no field initializer, so it
 * cannot `inject(ModalService)` itself - it reaches the same instance every
 * component gets via `ModalService.instance`, the one narrow exception to
 * "always use DI" documented on that getter. This is the trade-off called out
 * in the PR: a decorator that instead required every consuming class to
 * expose a same-named `modal` property would leak that requirement into
 * every class's public surface just to satisfy the decorator.
 */
export function Confirmable<A extends unknown[]>(
	messageKey: string,
	options: ConfirmableOptions<A> = {}
) {
	return function confirmableDecorator(
		_target: unknown,
		_propertyKey: string | symbol,
		descriptor: PropertyDescriptor
	): PropertyDescriptor {
		const original = descriptor.value as (...args: A) => unknown;

		descriptor.value = function (this: unknown, ...args: A) {
			const data: ConfirmDialogData = {
				titleKey: options.titleKey ?? 'confirm.title',
				bodyKey: messageKey,
				confirmKey: options.confirmKey ?? 'confirm.yes',
				cancelKey: options.cancelKey ?? 'confirm.no',
				params: options.params?.(...args)
			};

			confirmDialog(ModalService.instance, data)
				.then((confirmed) => {
					if (confirmed) original.apply(this, args);
				})
				.catch(() => {
					/* The dialog itself never rejects; this only guards against a
					   caller's own confirmed handler throwing, so a broken action
					   never surfaces as an unhandled rejection. */
				});
		};

		return descriptor;
	};
}
