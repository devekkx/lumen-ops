import { Observable } from 'rxjs';
import { Page, PageRequest } from '../models/pagination';
export interface GenericCollectionService<T extends { id: number }> { page(request: PageRequest): Observable<Page<T>>; get(id: number): Observable<T>; save(value: T): Observable<T>; delete(id: number): Observable<void>; }
