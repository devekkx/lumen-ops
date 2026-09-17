import { Component, input, output } from '@angular/core';

@Component({
	selector: 'lumen-page-header',
	standalone: true,
	template: `
		<div class="page-header">
			<div class="page-header__text">
				<h1 class="page-header__title">{{ title() }}</h1>
				@if (subtitle()) {
					<p class="page-header__subtitle">{{ subtitle() }}</p>
				}
			</div>
			@if (actionLabel()) {
				<button
					class="btn btn-primary btn-sm"
					type="button"
					[attr.data-write-action]="writeAction() || null"
					(click)="action.emit()"
				>
					{{ actionLabel() }}
				</button>
			}
		</div>
	`,
	styles: [
		`
			.page-header {
				display: flex;
				flex-wrap: wrap;
				gap: var(--space-base);
				align-items: flex-end;
				justify-content: space-between;
			}

			.page-header__text {
				display: flex;
				flex-direction: column;
				gap: 6px;
				min-width: 0;
			}

			.page-header__title {
				font: var(--type-display-xl);
				letter-spacing: var(--tracking-display-lg);
				color: var(--color-ink);
			}

			.page-header__subtitle {
				font: var(--type-body-sm);
				color: var(--color-muted);
				text-wrap: pretty;
			}
		`
	]
})
export class PageHeaderComponent {
	readonly title = input.required<string>();
	readonly subtitle = input<string>('');
	readonly actionLabel = input<string>('');

	readonly writeAction = input<string>('');

	readonly action = output<void>();
}
