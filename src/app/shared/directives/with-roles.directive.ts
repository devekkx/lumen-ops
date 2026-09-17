import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { Role } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';

@Directive({ selector: '[lumenWithRoles]', standalone: true })
export class WithRolesDirective {
	private readonly _template = inject(TemplateRef<unknown>);
	private readonly _container = inject(ViewContainerRef);
	private readonly _auth = inject(AuthService);
	private _roles: Role[] = [];
	constructor() {
		effect(() => {
			const allowed = this._auth.hasAllRoles(this._roles);
			this._container.clear();
			if (allowed) this._container.createEmbeddedView(this._template);
		});
	}
	@Input() set lumenWithRoles(value: Role[]) {
		this._roles = value;
	}
}

@Directive({ selector: '[lumenWithSomeRoles]', standalone: true })
export class WithSomeRolesDirective {
	private readonly _template = inject(TemplateRef<unknown>);
	private readonly _container = inject(ViewContainerRef);
	private readonly _auth = inject(AuthService);
	private _roles: Role[] = [];
	constructor() {
		effect(() => {
			const allowed = this._auth.hasSomeRoles(this._roles);
			this._container.clear();
			if (allowed) this._container.createEmbeddedView(this._template);
		});
	}
	@Input() set lumenWithSomeRoles(value: Role[]) {
		this._roles = value;
	}
}
