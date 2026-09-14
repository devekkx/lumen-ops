import { BehaviorSubject, Observable, catchError, combineLatest, debounceTime, distinctUntilChanged, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { Page, PageRequest, initialPageRequest } from '../../models/pagination';
import { GenericCollectionService } from '../../services/generic-collection.service';

export abstract class PaginatedTableBase<T extends { id: number }> {
  protected abstract readonly collection: GenericCollectionService<T>;
  protected readonly request = new BehaviorSubject<PageRequest>(initialPageRequest);
  readonly loading = new BehaviorSubject(false);
  readonly error = new BehaviorSubject<string | null>(null);
  readonly page$: Observable<Page<T>> = this.request.pipe(
    debounceTime(250), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    tap(() => { this.loading.next(true); this.error.next(null); }),
    switchMap((request) => this.collection.page(request).pipe(catchError(() => { this.error.next('Unable to load this collection.'); return of({ data: [], currentPage: request.page, lastPage: 1, total: 0, perPage: request.perPage }); }), finalize(() => this.loading.next(false)))),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  setSearch(searchTerm: string): void { this.update({ searchTerm, page: 1 }); }
  setPage(page: number): void { this.update({ page }); }
  sortBy(sort: string): void { const current = this.request.value; this.update({ sort, direction: current.sort === sort && current.direction === 'ASC' ? 'DESC' : 'ASC', page: 1 }); }
  refresh(): void { this.request.next({ ...this.request.value }); }
  private update(change: Partial<PageRequest>): void { this.request.next({ ...this.request.value, ...change }); }
}
