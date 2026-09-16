import { AbstractControl, ValidatorFn } from '@angular/forms';

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

/* A cross-field check has to live on the group - neither `reportedAt` nor
 * `dueAt` alone knows the other's value. But a group-level error is invisible
 * to a user who never scrolls up to the group: nothing red appears under
 * either date field, so this sets the error on the `dueAt` control itself
 * (in addition to returning it from the group), which is what actually
 * surfaces `.invalid-feedback` under the control the user is looking at.
 *
 * Errors already on `dueAt` from its own validators (Validators.required) are
 * preserved - this only ever adds/removes its own three keys, never wipes
 * someone else's.
 */
export const dateRangeValidator = (
	reportedAtKey = 'reportedAt',
	dueAtKey = 'dueAt'
): ValidatorFn => {
	return (group: AbstractControl) => {
		const reportedAtControl = group.get(reportedAtKey);
		const dueAtControl = group.get(dueAtKey);
		if (!reportedAtControl || !dueAtControl) return null;

		const OWN_KEYS = ['dateInvalid', 'dateOrder', 'dateSpan'] as const;
		const clearOwnErrors = (): void => {
			if (!dueAtControl.errors) return;
			const rest = { ...dueAtControl.errors };
			for (const key of OWN_KEYS) delete rest[key];
			dueAtControl.setErrors(Object.keys(rest).length ? rest : null);
		};

		const reportedRaw = reportedAtControl.value;
		const dueRaw = dueAtControl.value;

		/* Either side left blank is somebody else's problem (Validators.required
		   reports it); a range check on a value that isn't there yet would just
		   be noise. */
		if (!reportedRaw || !dueRaw) {
			clearOwnErrors();
			return null;
		}

		const reportedAt = new Date(reportedRaw);
		const dueAt = new Date(dueRaw);

		if (Number.isNaN(reportedAt.getTime()) || Number.isNaN(dueAt.getTime())) {
			const error = { dateInvalid: true };
			dueAtControl.setErrors({ ...dueAtControl.errors, ...error });
			return error;
		}

		if (dueAt.getTime() < reportedAt.getTime()) {
			const error = { dateOrder: true };
			dueAtControl.setErrors({ ...dueAtControl.errors, ...error });
			return error;
		}

		if (dueAt.getTime() - reportedAt.getTime() > MS_PER_YEAR) {
			const error = { dateSpan: true };
			dueAtControl.setErrors({ ...dueAtControl.errors, ...error });
			return error;
		}

		clearOwnErrors();
		return null;
	};
};
