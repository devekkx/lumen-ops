import { FormControl, FormGroup, Validators } from '@angular/forms';
import { dateRangeValidator } from './date-range.validator';

const group = (reportedAt: string | null, dueAt: string | null, dueAtValidators = []) =>
	new FormGroup(
		{
			reportedAt: new FormControl(reportedAt),
			dueAt: new FormControl(dueAt, dueAtValidators)
		},
		{ validators: dateRangeValidator() }
	);

describe('dateRangeValidator', () => {
	it('accepts a valid range and leaves dueAt error-free', () => {
		const form = group('2024-01-01', '2024-02-01');

		expect(form.errors).toBeNull();
		expect(form.get('dueAt')?.errors).toBeNull();
	});

	it('flags dueAt (not just the group) when due is before reported', () => {
		const form = group('2024-06-01', '2024-01-01');

		expect(form.errors).toEqual({ dateOrder: true });
		/* The point of the exercise: the error must be visible on the control
		   the user is actually looking at, not only on the group. */
		expect(form.get('dueAt')?.errors).toEqual({ dateOrder: true });
	});

	it('flags a span greater than one year', () => {
		const form = group('2023-01-01', '2024-06-01');

		expect(form.errors).toEqual({ dateSpan: true });
		expect(form.get('dueAt')?.errors).toEqual({ dateSpan: true });
	});

	it('flags an unparsable date string', () => {
		const form = group('2024-01-01', 'not-a-date');

		expect(form.errors).toEqual({ dateInvalid: true });
		expect(form.get('dueAt')?.errors).toEqual({ dateInvalid: true });
	});

	it('does nothing while either side is still blank', () => {
		const form = group(null, null);

		expect(form.errors).toBeNull();
		expect(form.get('dueAt')?.errors).toBeNull();
	});

	it('clears its own errors on dueAt without touching a pre-existing one', () => {
		const dueAt = new FormControl('2024-01-01', Validators.required);
		const form = new FormGroup(
			{ reportedAt: new FormControl('2024-06-01'), dueAt },
			{ validators: dateRangeValidator() }
		);
		expect(dueAt.errors).toEqual({ dateOrder: true });

		dueAt.setValue('2024-12-01');
		form.updateValueAndValidity();
		expect(dueAt.errors).toBeNull();

		dueAt.setValue('');
		form.updateValueAndValidity();
		expect(dueAt.errors).toEqual({ required: true });
	});

	it('accepts a range exactly at the one-year boundary', () => {
		const form = group('2023-01-01', '2023-12-31');

		expect(form.errors).toBeNull();
		expect(form.get('dueAt')?.errors).toBeNull();
	});
});
