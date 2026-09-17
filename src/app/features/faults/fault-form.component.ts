import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
	private readonly _route = inject(ActivatedRoute);
	private readonly _router = inject(Router);
	private readonly _faults = inject(FaultService);
	private readonly _modal = inject(ModalService);
	private readonly _toast = inject(ToastService);
	private readonly _transloco = inject(TranslocoService);

	readonly severities = SEVERITIES;

	private readonly _faultId = signal<string | null>(null);
	readonly mode = computed<FormMode>(() => (this._faultId() ? 'edit' : 'create'));

	private readonly _original = signal<Fault | null>(null);

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
		this._route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
			const id = params.get('id');
			this._faultId.set(id);
			if (id) this._load(id);
		});
	}

	/* DirtyFormHost, for dirtyFormGuard */

	isDirty(): boolean {
		return this.form.dirty;
	}

	confirmDiscard(): Promise<boolean> {
		return confirmDialog(this._modal, {
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
		void this._router.navigateByUrl('/averias');
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

		const existing = this._original();
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

		this._faults.save(model).subscribe({
			next: (saved) => {
				this.saving.set(false);
				this.form.markAsPristine();
				this._toast.show(this._transloco.translate('fault.saved', { code: saved.code }), 'healthy');
				void this._router.navigateByUrl('/averias');
			},
			error: () => this.saving.set(false)
		});
	}

	private _load(id: string): void {
		this.loading.set(true);
		this._faults.get(id).subscribe({
			next: (fault) => {
				this._original.set(fault);
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
				this._toast.show(this._transloco.translate('error.404'), 'critical');
				void this._router.navigateByUrl('/averias');
			}
		});
	}
}
