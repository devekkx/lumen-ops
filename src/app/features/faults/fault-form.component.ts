import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	FormControl,
	FormGroup,
	ReactiveFormsModule,
	Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '@core/api/toast.service';
import { ModalService } from '@core/overlay/modal.service';
import { confirmDialog } from '@core/overlay/confirm-dialog.component';
import { DirtyFormHost } from '@shared/guards/dirty-form.guard';
import { LuminairePickerComponent } from '@shared/components/luminaire-picker/luminaire-picker.component';
import { dateRangeValidator } from '@shared/validators/date-range.validator';
import { Fault, FaultService, SEVERITIES, Severity } from './fault.service';

type FormMode = 'create' | 'edit';

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DUE_DAYS = 7;

interface FieldError {
	key: string;
	params?: Record<string, unknown>;
}

type FaultFormField = 'luminaireId' | 'severity' | 'description' | 'reportedAt' | 'dueAt';

@Component({
	selector: 'lumen-fault-form',
	standalone: true,
	imports: [TranslocoDirective, ReactiveFormsModule, LuminairePickerComponent],
	templateUrl: './fault-form.component.html'
})
export class FaultFormComponent implements DirtyFormHost {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly faults = inject(FaultService);
	private readonly modal = inject(ModalService);
	private readonly toast = inject(ToastService);
	private readonly transloco = inject(TranslocoService);

	readonly severities = SEVERITIES;

	private readonly faultId = signal<string | null>(null);
	/* The one thing every "isEdit ? X : Y" question in the template actually
	   needs — everything else (loading the record, defaulting the form,
	   building the save payload) is handled here, once, rather than repeated
	   as scattered conditionals. */
	readonly mode = computed<FormMode>(() => (this.faultId() ? 'edit' : 'create'));

	/* The full record as loaded, kept only so save() can merge the form's
	   patch over fields the form never edits (code, status, photos,
	   reportedBy, and the luminaire's denormalised street/zone) — a PUT that
	   sent those back blank would overwrite server-held data with nothing. */
	private readonly original = signal<Fault | null>(null);

	readonly loading = signal(false);
	readonly saving = signal(false);

	readonly form = new FormGroup(
		{
			luminaireId: new FormControl<string | null>(null, Validators.required),
			severity: new FormControl<Severity>('MEDIUM', {
				nonNullable: true,
				validators: Validators.required
			}),
			description: new FormControl('', {
				nonNullable: true,
				validators: [Validators.required, Validators.minLength(10), Validators.maxLength(500)]
			}),
			reportedAt: new FormControl(isoDate(new Date()), {
				nonNullable: true,
				validators: Validators.required
			}),
			dueAt: new FormControl(isoDate(new Date(Date.now() + DEFAULT_DUE_DAYS * DAY_MS)), {
				nonNullable: true,
				validators: Validators.required
			})
		},
		{ validators: dateRangeValidator() }
	);

	constructor() {
		this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
			const id = params.get('id');
			this.faultId.set(id);
			if (id) this.load(id);
		});
	}

	/* DirtyFormHost, for dirtyFormGuard */

	isDirty(): boolean {
		return this.form.dirty;
	}

	confirmDiscard(): Promise<boolean> {
		return confirmDialog(this.modal, {
			titleKey: 'fault.dirtyTitle',
			bodyKey: 'fault.dirtyBody',
			confirmKey: 'fault.dirtyLeave',
			cancelKey: 'fault.dirtyStay'
		});
	}

	fieldError(name: FaultFormField): FieldError | null {
		const control = this.form.get(name);
		if (!control || !control.errors || !(control.touched || control.dirty)) return null;

		const errors = control.errors;
		if (errors['required']) return { key: 'validation.required' };
		if (errors['minlength']) {
			return { key: 'validation.minLength', params: { n: errors['minlength'].requiredLength } };
		}
		if (errors['maxlength']) {
			return { key: 'validation.maxLength', params: { n: errors['maxlength'].requiredLength } };
		}
		if (errors['dateOrder']) return { key: 'validation.dateOrder' };
		if (errors['dateSpan']) return { key: 'validation.dateSpan' };
		if (errors['dateInvalid']) return { key: 'validation.dateInvalid' };
		return null;
	}

	cancel(): void {
		void this.router.navigateByUrl('/averias');
	}

	save(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.saving.set(true);
		const value = this.form.getRawValue();
		const patch = {
			luminaireId: value.luminaireId as string,
			severity: value.severity,
			description: value.description,
			reportedAt: new Date(value.reportedAt).toISOString(),
			dueAt: new Date(value.dueAt).toISOString()
		};

		const existing = this.original();
		const model: Fault = existing
			? { ...existing, ...patch }
			: {
					id: '',
					code: '',
					luminaireCode: '',
					street: '',
					zone: '',
					zoneId: '',
					status: 'REPORTED',
					reportedBy: 'INSPECTOR',
					photos: 0,
					...patch
				};

		this.faults.save(model).subscribe({
			next: (saved) => {
				this.saving.set(false);
				/* Must happen before navigating away: a pristine form is what
				   stops dirtyFormGuard from prompting after a save that already
				   succeeded. */
				this.form.markAsPristine();
				this.toast.show(this.transloco.translate('fault.saved', { code: saved.code }), 'healthy');
				void this.router.navigateByUrl('/averias');
			},
			error: () => this.saving.set(false)
		});
	}

	private load(id: string): void {
		this.loading.set(true);
		this.faults.get(id).subscribe({
			next: (fault) => {
				this.original.set(fault);
				this.form.reset({
					luminaireId: fault.luminaireId,
					severity: fault.severity,
					description: fault.description,
					reportedAt: fault.reportedAt.slice(0, 10),
					dueAt: fault.dueAt.slice(0, 10)
				});
				this.loading.set(false);
			},
			error: () => {
				this.loading.set(false);
				this.toast.show(this.transloco.translate('error.404'), 'critical');
				void this.router.navigateByUrl('/averias');
			}
		});
	}
}
