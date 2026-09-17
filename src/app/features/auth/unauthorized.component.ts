import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

/* Denied navigations land here rather than failing silently. A guard that
   returns false with no destination leaves the user on the page they were
   already on, which reads as a broken link. */
@Component({
	selector: 'lumen-unauthorized',
	standalone: true,
	imports: [TranslocoDirective],
	template: `
		<div class="unauth" *transloco="let t">
			<span class="unauth__mark" aria-hidden="true">!</span>
			<h1 class="unauth__title">{{ t('unauth.title') }}</h1>
			<p class="unauth__body">{{ t('unauth.body') }}</p>
			<button class="btn btn-primary btn-sm" type="button" (click)="home()">
				{{ t('unauth.back') }}
			</button>
		</div>
	`,
	styles: [
		`
			.unauth {
				background: var(--color-canvas);
				border: 1px solid var(--color-hairline-soft);
				border-radius: var(--radius-md);
				padding: 56px var(--space-lg);
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: var(--space-base);
				text-align: center;
			}

			.unauth__mark {
				width: 56px;
				height: 56px;
				border-radius: var(--radius-full);
				display: grid;
				place-items: center;
				background: var(--tone-critical-tint);
				color: var(--color-error);
				font: var(--type-display-sm);
			}

			.unauth__title {
				font: var(--type-display-sm);
				color: var(--color-ink);
			}

			.unauth__body {
				max-width: 460px;
				font: var(--type-body-sm);
				color: var(--color-muted);
				text-wrap: pretty;
			}
		`
	]
})
export class UnauthorizedComponent {
	private readonly _router = inject(Router);

	/* Back to `/`, so the same canMatch chain that decides a home page on login
	   decides it here too. */
	home(): void {
		void this._router.navigateByUrl('/');
	}
}
