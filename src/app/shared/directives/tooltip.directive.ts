import {
	Directive,
	ElementRef,
	Input,
	OnChanges,
	OnDestroy,
	Renderer2,
	SimpleChanges,
	inject
} from '@angular/core';

declare const bootstrap:
	| { Tooltip: new (el: Element, opts?: Record<string, unknown>) => LumenTooltipInstance }
	| undefined;

interface LumenTooltipInstance {
	dispose(): void;
	setContent(content: Record<string, string>): void;
}

@Directive({
	selector: '[data-bs-toggle="tooltip"]',
	standalone: true
})
export class LumenTooltipDirective implements OnChanges, OnDestroy {
	@Input() title = '';
	@Input() placement: 'top' | 'right' | 'bottom' | 'left' = 'top';

	private readonly _el = inject(ElementRef<HTMLElement>);
	private readonly _renderer = inject(Renderer2);
	private _tooltip: LumenTooltipInstance | undefined;

	ngOnChanges(changes: SimpleChanges): void {
		if (!('title' in changes)) return;

		if (!this.title) {
			this._teardown();
			return;
		}

		if (this._tooltip) {
			this._tooltip.setContent({ '.tooltip-inner': this.title });
			return;
		}

		this._renderer.setAttribute(this._el.nativeElement, 'title', this.title);

		if (typeof bootstrap === 'undefined') return;

		this._tooltip = new bootstrap.Tooltip(this._el.nativeElement, {
			trigger: 'hover focus',
			container: 'body',
			placement: this.placement
		});

		this._renderer.listen(this._el.nativeElement, 'click', () => this._el.nativeElement.blur());
	}

	ngOnDestroy(): void {
		this._teardown();
	}

	private _teardown(): void {
		this._tooltip?.dispose();
		this._tooltip = undefined;
		this._renderer.removeAttribute(this._el.nativeElement, 'title');
	}
}
