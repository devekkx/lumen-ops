import { Observable } from 'rxjs';
import { Page, PageRequest } from '../models/pagination';

/* The one contract a paginated table base needs from any collection. Only
   page() is required - a read-only table like luminaires has no get/save/
   delete to offer, and forcing it to fake them would be dead code rather
   than a real capability. */
export interface GenericCollectionService<T> {
	page(request: PageRequest): Observable<Page<T>>;
	get?(id: string): Observable<T>;
	save?(value: T): Observable<T>;
	delete?(id: string): Observable<void>;
}
