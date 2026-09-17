import { CanDeactivateFn } from '@angular/router';

/* Any reactive-form page that wants the exit prompt implements this - just
   "is there unsaved work" and "ask the user about it", not a form-specific
   contract, so the guard stays reusable past the fault form. */
export interface DirtyFormHost {
	isDirty(): boolean;
	confirmDiscard(): Promise<boolean>;
}

/* A `window.confirm` would work here, but it is unstyled, blocks the whole
 * tab (including the CDK overlay, so it cannot be dismissed with Escape the
 * way every other modal in the app is), and cannot be asserted against in a
 * component spec the way the CDK-backed dialog can. Routing through the same
 * ModalService as everything else means the exit prompt looks, keyboards and
 * tests like every other confirm in the app instead of like a special case.
 */
/* boolean | Promise<boolean> is CanDeactivateFn's own sanctioned return
   union, not an accident - the clean-form path returns synchronously on
   purpose (see the spec's `toBe(true)`, not `toBeResolvedTo(true)`), so
   forcing both paths to the same type here would change real behaviour just
   to satisfy the linter. */
// eslint-disable-next-line sonarjs/function-return-type
export const dirtyFormGuard: CanDeactivateFn<DirtyFormHost> = (component) => {
	if (!component.isDirty()) return true;
	return component.confirmDiscard();
};
