import { ConfirmDialogData, confirmDialog } from '@core/overlay/confirm-dialog.component';
import { ModalService } from '@core/overlay/modal.service';

export interface ConfirmableOptions<A extends unknown[]> {
	titleKey?: string;
	confirmKey?: string;
	cancelKey?: string;
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
					/* empty */
				});
		};

		return descriptor;
	};
}
