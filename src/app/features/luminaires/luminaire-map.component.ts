import {
	AfterViewInit,
	Component,
	DestroyRef,
	ElementRef,
	OnDestroy,
	ViewChild,
	inject,
	signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import Feature from 'ol/Feature';
import OlMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import View from 'ol/View';
import { boundingExtent } from 'ol/extent';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import ClusterSource from 'ol/source/Cluster';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import { pillClass, toneInk } from '@shared/models/status-tone';
import {
	LUMINAIRE_STATUSES,
	Luminaire,
	LuminaireService,
	LuminaireStatus
} from './luminaire.service';

const SEVERITY_ORDER: readonly LuminaireStatus[] = ['FAULT', 'MAINTENANCE', 'OFFLINE', 'OK'];

const MAP_CENTER: [number, number] = [-3.7074, 40.4155];
const MAP_ZOOM = 12;

const CLUSTER_DISTANCE = 50;

@Component({
	selector: 'lumen-map',
	standalone: true,
	imports: [TranslocoDirective],
	templateUrl: './luminaire-map.component.html',
	styleUrl: './luminaire-map.component.scss'
})
export class LuminaireMapComponent implements AfterViewInit, OnDestroy {
	private readonly _luminaires = inject(LuminaireService);
	private readonly _destroyRef = inject(DestroyRef);

	@ViewChild('mapHost') private readonly _mapHost!: ElementRef<HTMLElement>;

	private _map?: OlMap;
	private _vectorLayer?: VectorLayer<ClusterSource>;
	private readonly _vectorSource = new VectorSource<Feature<Point>>();
	private readonly _clusterSource = new ClusterSource({
		distance: CLUSTER_DISTANCE,
		source: this._vectorSource
	});

	private readonly _pointStyles = new Map<LuminaireStatus, Style>();
	private readonly _clusterStyles = new Map<string, Style>();

	readonly statuses = LUMINAIRE_STATUSES;
	readonly loading = signal(false);
	readonly apiError = signal(false);
	readonly tilesOffline = signal(false);
	readonly clustered = signal(true);
	readonly count = signal(0);
	readonly selected = signal<Luminaire | null>(null);

	tone(value: string): string {
		return pillClass(value);
	}

	toggleCluster(enabled: boolean): void {
		this.clustered.set(enabled);
		this._clusterSource.setDistance(enabled ? CLUSTER_DISTANCE : 0);
	}

	retry(): void {
		this._loadFeatures();
	}

	ngAfterViewInit(): void {
		const osmSource = new OSM();
		osmSource.on('tileloaderror', () => this.tilesOffline.set(true));

		this._vectorLayer = new VectorLayer({
			source: this._clusterSource,
			style: (feature) => this._styleFor(feature as Feature<Point>)
		});

		this._map = new OlMap({
			target: this._mapHost.nativeElement,
			layers: [new TileLayer({ source: osmSource }), this._vectorLayer],
			view: new View({ center: fromLonLat(MAP_CENTER), zoom: MAP_ZOOM })
		});

		this._map.on('singleclick', (event) => this._handleClick(event));

		this._map.on('pointermove', (event) => {
			if (event.dragging) return;
			const hasFeature = !!this._map?.forEachFeatureAtPixel(event.pixel, () => true);
			this._mapHost.nativeElement.style.cursor = hasFeature ? 'pointer' : '';
		});

		this._loadFeatures();
	}

	/* map.dispose() - not just setTarget(undefined) - is what OpenLayers itself
	   documents for teardown: it detaches the viewport, disconnects the map's
	   own resize observer, cancels any pending render frame, and clears every
	   listener registered on the map (including the singleclick handler above)
	   in one call. The vector/cluster sources and the OSM tile source are not
	   reachable from anywhere else once `map` is dropped, so they - and the
	   tileloaderror listener on the OSM source - become garbage once this
	   component instance does. Nothing here registers a listener on `window`
	   or `document`, or hands a reference to `this` to a longer-lived service,
	   so repeated create/destroy across route visits does not accumulate. */
	ngOnDestroy(): void {
		this._map?.dispose();
		this._map = undefined;
	}

	private _loadFeatures(): void {
		this.loading.set(true);
		this.apiError.set(false);

		this._luminaires
			.geo({})
			.pipe(takeUntilDestroyed(this._destroyRef))
			.subscribe({
				next: (items) => {
					this._vectorSource.clear();
					this._vectorSource.addFeatures(this._buildFeatures(items));
					this.count.set(items.length);
					this.loading.set(false);
				},
				error: () => {
					this.apiError.set(true);
					this.loading.set(false);
				}
			});
	}

	private _buildFeatures(items: readonly Luminaire[]): Feature<Point>[] {
		return items.map((lamp) => {
			const feature = new Feature({ geometry: new Point(fromLonLat([lamp.lon, lamp.lat])) });
			feature.setId(lamp.id);
			feature.set('lamp', lamp);
			return feature;
		});
	}

	private _handleClick(event: MapBrowserEvent): void {
		const map = this._map;
		if (!map) return;

		const clicked = map.forEachFeatureAtPixel(event.pixel, (feature) => feature as Feature<Point>);
		if (!clicked) {
			this._select(null);
			return;
		}

		const members = (clicked.get('features') as Feature<Point>[] | undefined) ?? [clicked];
		if (members.length === 1) {
			this._select(members[0].get('lamp') as Luminaire);
			return;
		}

		const extent = boundingExtent(
			members.map((member) => (member.getGeometry() as Point).getCoordinates())
		);
		map.getView().fit(extent, { padding: [48, 48, 48, 48], maxZoom: 18, duration: 250 });
		this._select(null);
	}

	private _select(lamp: Luminaire | null): void {
		this.selected.set(lamp);
		this._vectorLayer?.changed();
	}

	private _styleFor(feature: Feature<Point>): Style[] {
		const members = feature.get('features') as Feature<Point>[];
		if (members.length === 1) {
			const lamp = members[0].get('lamp') as Luminaire;
			if (this.selected()?.id === lamp.id) return this._selectedPointStyle(lamp.status);
			return [this._pointStyle(lamp.status)];
		}
		return [this._clusterStyle(members)];
	}

	private _selectedPointStyle(status: LuminaireStatus): Style[] {
		return [
			new Style({
				image: new Circle({
					radius: 13,
					stroke: new Stroke({ color: this._selectionColor(), width: 2.5 })
				}),
				zIndex: 9
			}),
			new Style({
				image: new Circle({
					radius: 7,
					fill: new Fill({ color: toneInk(status) }),
					stroke: new Stroke({ color: '#fff', width: 2 })
				}),
				zIndex: 10
			})
		];
	}

	private _selectionColor(): string {
		const custom = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-primary')
			.trim();
		return custom || '#ff385c';
	}

	private _pointStyle(status: LuminaireStatus): Style {
		let style = this._pointStyles.get(status);
		if (!style) {
			style = new Style({
				image: new Circle({
					radius: 6,
					fill: new Fill({ color: toneInk(status) }),
					stroke: new Stroke({ color: '#fff', width: 1.5 })
				})
			});
			this._pointStyles.set(status, style);
		}
		return style;
	}

	private _clusterStyle(members: Feature<Point>[]): Style {
		const status = this._dominantStatus(members);
		const key = `${status}:${members.length}`;
		let style = this._clusterStyles.get(key);
		if (!style) {
			const radius = Math.min(10 + Math.sqrt(members.length) * 2, 22);
			style = new Style({
				image: new Circle({
					radius,
					fill: new Fill({ color: toneInk(status) }),
					stroke: new Stroke({ color: '#fff', width: 2 })
				}),
				text: new Text({
					text: String(members.length),
					fill: new Fill({ color: '#fff' }),
					font: '600 12px sans-serif'
				})
			});
			this._clusterStyles.set(key, style);
		}
		return style;
	}

	private _dominantStatus(members: Feature<Point>[]): LuminaireStatus {
		const present = new Set(members.map((member) => (member.get('lamp') as Luminaire).status));
		return SEVERITY_ORDER.find((status) => present.has(status)) ?? 'OK';
	}
}
