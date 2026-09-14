import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({ standalone: true, template: `<section class="card shadow-sm"><div class="card-body"><p class="text-uppercase text-secondary small mb-2">Build-week feature</p><h1>{{ title() }}</h1><p class="mb-0">This lazy-loaded feature is ready for its table, form, map, or chart exercise.</p></div></section>` })
export class PlaceholderPageComponent { private readonly route = inject(ActivatedRoute); readonly title = computed(() => this.route.snapshot.data['breadcrumb'] as string); }
