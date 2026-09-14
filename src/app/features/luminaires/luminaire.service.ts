import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page, PageRequest } from '@shared/models/pagination';
import { GenericCollectionService } from '@shared/services/generic-collection.service';

export interface Luminaire { id: number; code: string; street: string; lampType: string; wattage: number; status: string; }
@Injectable({ providedIn: 'root' })
export class LuminaireService implements GenericCollectionService<Luminaire> {
  private readonly http = inject(HttpClient);
  page(request: PageRequest): Observable<Page<Luminaire>> { const params = new HttpParams({ fromObject: { page: request.page, perPage: request.perPage, searchTerm: request.searchTerm, sort: request.sort, direction: request.direction } }); return this.http.get<Page<Luminaire>>('/api/luminaires/paged', { params }); }
  get(id: number): Observable<Luminaire> { return this.http.get<Luminaire>(`/api/luminaires/${id}`); }
  save(value: Luminaire): Observable<Luminaire> { return this.http.put<Luminaire>(`/api/luminaires/${value.id}`, value); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`/api/luminaires/${id}`); }
}
