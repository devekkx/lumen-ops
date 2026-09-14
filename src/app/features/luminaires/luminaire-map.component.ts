import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import Map from 'ol/Map'; import View from 'ol/View'; import TileLayer from 'ol/layer/Tile'; import VectorLayer from 'ol/layer/Vector'; import OSM from 'ol/source/OSM'; import VectorSource from 'ol/source/Vector'; import Feature from 'ol/Feature'; import Point from 'ol/geom/Point'; import { fromLonLat } from 'ol/proj'; import { Circle, Fill, Stroke, Style } from 'ol/style';

@Component({ standalone: true, selector: 'lumen-map', template: `<div #map class="map" aria-label="Luminaire map"></div>`, styles: ['.map { height: 420px; width: 100%; border-radius: .5rem; overflow: hidden; }'] })
export class LuminaireMapComponent implements AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient); private map?: Map; @ViewChild('map') mapElement!: ElementRef<HTMLElement>;
  ngAfterViewInit(): void { this.http.get<any>('/api/luminaires/paged', { params: new HttpParams().set('perPage', 600) }).subscribe(({ data }) => { const source = new VectorSource({ features: data.map((lamp: any) => new Feature({ geometry: new Point(fromLonLat([lamp.lon, lamp.lat])), lamp })) }); const layer = new VectorLayer({ source, style: (feature) => new Style({ image: new Circle({ radius: 5, fill: new Fill({ color: ({ active: '#198754', warning: '#d39e00', fault: '#dc3545', inactive: '#6c757d' } as any)[feature.get('lamp').status] }), stroke: new Stroke({ color: 'white', width: 1 }) }) }) }); this.map = new Map({ target: this.mapElement.nativeElement, layers: [new TileLayer({ source: new OSM() }), layer], view: new View({ center: fromLonLat([-21.94, 64.1466]), zoom: 12 }) }); }); }
  ngOnDestroy(): void { this.map?.setTarget(undefined); }
}
