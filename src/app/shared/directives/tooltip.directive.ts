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

/* The Bootstrap JS bundle (node_modules/bootstrap/dist/js/bootstrap.bundle.min.js)
   is loaded as a plain global <script> from angular.json's "scripts" array, so
   `bootstrap` is a window global here, not something this file imports - that
   keeps Bootstrap's JS in the one bundle Angular already serves separately
   rather than pulling a second copy of it into the main bundle via an ES
   import. Absent in Karma (the test builder's "scripts" array is empty), which
   is why every use below is guarded. */
declare const bootstrap:
	| { Tooltip: new (el: Element, opts?: Record<string, unknown>) => LumenTooltipInstance }
	| undefined;

interface LumenTooltipInstance {
	dispose(): void;
	setContent(content: Record<string, string>): void;
}

/* Wraps a real Bootstrap Tooltip's init/update/dispose lifecycle so a template
   author only ever writes `data-bs-toggle="tooltip" title="..."` - matching
   Bootstrap's own documented markup exactly - and gets the JS half for free,
   rather than hand-rolling ViewChild + ngAfterViewInit in every component that
   needs one.

   Declaring `@Input() title` here means Angular routes the `[title]` (or
   `title="{{ ... }}"`) binding to this directive instead of the native DOM
   property, so the directive - not Angular - owns writing the `title`
   attribute; that is what lets a locale change flow through `setContent()`
   rather than fighting Bootstrap's own rewrite of the attribute (Bootstrap
   moves it to `data-bs-original-title` and blanks `title` on init, to stop the
   browser's native tooltip from doubling up with its own). */
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

		/* The native attribute is the documented Bootstrap markup and the
		   no-JS/no-Bootstrap fallback (a plain browser tooltip); set it before
		   handing the element to Bootstrap, which reads it once at construction. */
		this._renderer.setAttribute(this._el.nativeElement, 'title', this.title);

		if (typeof bootstrap === 'undefined') return;

		this._tooltip = new bootstrap.Tooltip(this._el.nativeElement, {
			trigger: 'hover focus',
			container: 'body',
			placement: this.placement
		});

		/* trigger: 'hover focus' only fully hides once BOTH are false - clicking
		   a button keeps it focused (in most browsers, without moving the
		   pointer away), so the tooltip stayed stuck open until the pointer
		   moved elsewhere AND something else stole focus. Blurring right after
		   the click drops the "focus" half as soon as the action it describes
		   has actually happened, instead of leaving it hanging on hover alone. */
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
