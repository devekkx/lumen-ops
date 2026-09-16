import { Directive, ElementRef, Input, OnChanges, OnDestroy, Renderer2, SimpleChanges, inject } from '@angular/core';

/* The Bootstrap JS bundle (node_modules/bootstrap/dist/js/bootstrap.bundle.min.js)
   is loaded as a plain global <script> from angular.json's "scripts" array, so
   `bootstrap` is a window global here, not something this file imports — that
   keeps Bootstrap's JS in the one bundle Angular already serves separately
   rather than pulling a second copy of it into the main bundle via an ES
   import. Absent in Karma (the test builder's "scripts" array is empty), which
   is why every use below is guarded. */
declare const bootstrap: { Tooltip: new (el: Element, opts?: Record<string, unknown>) => LumenTooltipInstance } | undefined;

interface LumenTooltipInstance {
	dispose(): void;
	setContent(content: Record<string, string>): void;
}

/* Wraps a real Bootstrap Tooltip's init/update/dispose lifecycle so a template
   author only ever writes `data-bs-toggle="tooltip" title="..."` — matching
   Bootstrap's own documented markup exactly — and gets the JS half for free,
   rather than hand-rolling ViewChild + ngAfterViewInit in every component that
   needs one.

   Declaring `@Input() title` here means Angular routes the `[title]` (or
   `title="{{ ... }}"`) binding to this directive instead of the native DOM
   property, so the directive — not Angular — owns writing the `title`
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

	private readonly el = inject(ElementRef<HTMLElement>);
	private readonly renderer = inject(Renderer2);
	private tooltip: LumenTooltipInstance | undefined;

	ngOnChanges(changes: SimpleChanges): void {
		if (!('title' in changes)) return;

		if (!this.title) {
			this.teardown();
			return;
		}

		if (this.tooltip) {
			this.tooltip.setContent({ '.tooltip-inner': this.title });
			return;
		}

		/* The native attribute is the documented Bootstrap markup and the
		   no-JS/no-Bootstrap fallback (a plain browser tooltip); set it before
		   handing the element to Bootstrap, which reads it once at construction. */
		this.renderer.setAttribute(this.el.nativeElement, 'title', this.title);

		if (typeof bootstrap === 'undefined') return;

		this.tooltip = new bootstrap.Tooltip(this.el.nativeElement, {
			trigger: 'hover focus',
			container: 'body'
		});
	}

	ngOnDestroy(): void {
		this.teardown();
	}

	private teardown(): void {
		this.tooltip?.dispose();
		this.tooltip = undefined;
		this.renderer.removeAttribute(this.el.nativeElement, 'title');
	}
}
