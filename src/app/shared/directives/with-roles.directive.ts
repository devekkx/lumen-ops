import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { Role } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';

@Directive({ selector: '[lumenWithRoles]', standalone: true })
export class WithRolesDirective {
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);
  private roles: Role[] = [];
  constructor() { effect(() => { const allowed = this.auth.hasAllRoles(this.roles); this.container.clear(); if (allowed) this.container.createEmbeddedView(this.template); }); }
  @Input() set lumenWithRoles(value: Role[]) { this.roles = value; }
}

@Directive({ selector: '[lumenWithSomeRoles]', standalone: true })
export class WithSomeRolesDirective {
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);
  private roles: Role[] = [];
  constructor() { effect(() => { const allowed = this.auth.hasSomeRoles(this.roles); this.container.clear(); if (allowed) this.container.createEmbeddedView(this.template); }); }
  @Input() set lumenWithSomeRoles(value: Role[]) { this.roles = value; }
}
