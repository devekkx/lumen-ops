import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginatedTableComponent } from '@shared/components/paginated-table/paginated-table.component';
import { PaginatedTableBase } from '@shared/components/paginated-table/paginated-table.base';
import { Luminaire, LuminaireService } from './luminaire.service';
import { LuminaireMapComponent } from './luminaire-map.component';

@Component({ standalone: true, imports: [AsyncPipe, FormsModule, PaginatedTableComponent, LuminaireMapComponent], template: `<section><div class="d-flex justify-content-between align-items-center mb-4"><div><p class="text-uppercase text-secondary small mb-1">Asset register</p><h1>Luminaires</h1></div><button class="btn btn-lumen" (click)="refresh()">Refresh</button></div><div class="card mb-3"><lumen-map /></div><input #search class="form-control mb-3" placeholder="Search code or street" (input)="setSearch(search.value)" aria-label="Search luminaires">@if (error | async; as message) { <p class="alert alert-danger">{{ message }}</p> }<lumen-table [columns]="columns" [page]="page$ | async" [loading]="loading | async" (pageChange)="setPage($event)" (sort)="sortBy($event)" /></section>` })
export class LuminairesPageComponent extends PaginatedTableBase<Luminaire> { protected readonly collection = inject(LuminaireService); readonly columns: { key: Extract<keyof Luminaire, string>; label: string }[] = [{ key: 'code', label: 'Code' }, { key: 'street', label: 'Street' }, { key: 'lampType', label: 'Lamp type' }, { key: 'wattage', label: 'Watts' }, { key: 'status', label: 'Status' }]; }
