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
/* Renamed on import: the global Map is used two lines down for the style
   caches, and `ol/Map`'s default export would otherwise shadow it. */
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

/* Worst-first: a mixed cluster is coloured by its most urgent member, so a
   blob of grouped points still hints that something inside needs attention
   rather than averaging the trouble away. */
const SEVERITY_ORDER: readonly LuminaireStatus[] = ['FAULT', 'MAINTENANCE', 'OFFLINE', 'OK'];

/* Centro, Madrid (see ZONES in mock-api/seed.ts) - the real centre of the
   contract's service area, not an arbitrary point. */
const MAP_CENTER: [number, number] = [-3.7074, 40.4155];
const MAP_ZOOM = 12;

/* 600 raw points are already noticeable while dragging (see map.clusterHint).
   40px is too tight to save much work at this zoom; 60px starts merging
   points that sit on different streets. 50px is the middle of that range and
   reads well against Madrid's block size at zoom ~12-14. */
const CLUSTER_DISTANCE = 50;

@Component({
	selector: 'lumen-map',
	standalone: true,
	imports: [TranslocoDirective],
	templateUrl: './luminaire-map.component.html',
	styleUrl: './luminaire-map.component.scss'
})
export class LuminaireMapComponent implements AfterViewInit, OnDestroy {
	private readonly luminaires = inject(LuminaireService);
	private readonly destroyRef = inject(DestroyRef);

	@ViewChild('mapHost') private readonly mapHost!: ElementRef<HTMLElement>;

	private map?: OlMap;
	private vectorLayer?: VectorLayer<ClusterSource>;
	private readonly vectorSource = new VectorSource<Feature<Point>>();
	private readonly clusterSource = new ClusterSource({
		distance: CLUSTER_DISTANCE,
		source: this.vectorSource
	});

	private readonly pointStyles = new Map<LuminaireStatus, Style>();
	private readonly clusterStyles = new Map<string, Style>();

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
		this.clusterSource.setDistance(enabled ? CLUSTER_DISTANCE : 0);
	}

	retry(): void {
		this.loadFeatures();
	}

	ngAfterViewInit(): void {
		const osmSource = new OSM();
		/* Fires per failed tile, which is exactly the "OSM tiles could not load"
		   case map.offline describes - the vector layer is a separate source and
		   keeps working regardless. */
		osmSource.on('tileloaderror', () => this.tilesOffline.set(true));

		this.vectorLayer = new VectorLayer({
			source: this.clusterSource,
			style: (feature) => this.styleFor(feature as Feature<Point>)
		});

		this.map = new OlMap({
			target: this.mapHost.nativeElement,
			layers: [new TileLayer({ source: osmSource }), this.vectorLayer],
			view: new View({ center: fromLonLat(MAP_CENTER), zoom: MAP_ZOOM })
		});

		this.map.on('singleclick', (event) => this.handleClick(event));

		/* The only visible sign a point is hoverable at all, short of a full
		   highlight-on-hover style: the cursor itself. Standard OpenLayers
		   idiom - forEachFeatureAtPixel on pointermove rather than a DOM
		   hover, since the "points" are canvas pixels, not real elements. */
		this.map.on('pointermove', (event) => {
			if (event.dragging) return;
			const hasFeature = !!this.map?.forEachFeatureAtPixel(event.pixel, () => true);
			this.mapHost.nativeElement.style.cursor = hasFeature ? 'pointer' : '';
		});

		this.loadFeatures();
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
		this.map?.dispose();
		this.map = undefined;
	}

	private loadFeatures(): void {
		this.loading.set(true);
		this.apiError.set(false);

		this.luminaires
			.geo({})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.vectorSource.clear();
					this.vectorSource.addFeatures(this.buildFeatures(items));
					this.count.set(items.length);
					this.loading.set(false);
				},
				error: () => {
					this.apiError.set(true);
					this.loading.set(false);
				}
			});
	}

	private buildFeatures(items: readonly Luminaire[]): Feature<Point>[] {
		return items.map((lamp) => {
			const feature = new Feature({ geometry: new Point(fromLonLat([lamp.lon, lamp.lat])) });
			feature.setId(lamp.id);
			feature.set('lamp', lamp);
			return feature;
		});
	}

	private handleClick(event: MapBrowserEvent): void {
		const map = this.map;
		if (!map) return;

		const clicked = map.forEachFeatureAtPixel(event.pixel, (feature) => feature as Feature<Point>);
		if (!clicked) {
			this.select(null);
			return;
		}

		const members = (clicked.get('features') as Feature<Point>[] | undefined) ?? [clicked];
		if (members.length === 1) {
			this.select(members[0].get('lamp') as Luminaire);
			return;
		}

		/* A cluster of more than one point has no single record to show, so a
		   click zooms into it instead - the conventional OpenLayers cluster
		   interaction, and the only one that resolves the ambiguity without
		   inventing a "which one did you mean" picker. */
		const extent = boundingExtent(
			members.map((member) => (member.getGeometry() as Point).getCoordinates())
		);
		map.getView().fit(extent, { padding: [48, 48, 48, 48], maxZoom: 18, duration: 250 });
		this.select(null);
	}

	/* styleFor reads this.selected() to decide whether a point is highlighted,
	   but OpenLayers has no idea an Angular signal changed underneath it - a
	   plain this.selected.set(...) updates the side panel (it's a template
	   binding) but leaves every point on the canvas exactly as it was
	   rendered. vectorLayer.changed() is what makes OL re-invoke styleFor for
	   every feature, which is what actually puts a highlight on the map. */
	private select(lamp: Luminaire | null): void {
		this.selected.set(lamp);
		this.vectorLayer?.changed();
	}

	private styleFor(feature: Feature<Point>): Style | Style[] {
		const members = feature.get('features') as Feature<Point>[];
		if (members.length === 1) {
			const lamp = members[0].get('lamp') as Luminaire;
			if (this.selected()?.id === lamp.id) return this.selectedPointStyle(lamp.status);
			return this.pointStyle(lamp.status);
		}
		return this.clusterStyle(members);
	}

	/* Not cached like pointStyle/clusterStyle - at most one feature ever
	   wears this at a time, so there is nothing to gain by memoizing per
	   status, and doing so would risk two differently-selected features
	   sharing a style object across renders.

	   Two layered styles, not one bigger/thicker circle of the same status
	   colour: a selected FAULT point is already red, so a marginally larger
	   red circle with a marginally thicker white ring reads as "a bit
	   bigger", not "selected". The halo ring below is the app's own accent
	   colour rather than the status tone, so "this is the one you picked"
	   looks the same regardless of which status happens to sit under it. */
	private selectedPointStyle(status: LuminaireStatus): Style[] {
		return [
			new Style({
				image: new Circle({
					radius: 13,
					stroke: new Stroke({ color: this.selectionColor(), width: 2.5 })
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

	/* --color-primary rather than a hardcoded hex, same read-the-cascade
	   approach as toneInk() below - falls back to the token's own value for
	   the same reason toneInk falls back: unit tests and a pre-stylesheet
	   render have no cascade to read yet. */
	private selectionColor(): string {
		const custom = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-primary')
			.trim();
		return custom || '#ff385c';
	}

	/* toneInk() reads a CSS custom property, so the four possible results are
	   cached rather than re-read from the cascade on every render frame. */
	private pointStyle(status: LuminaireStatus): Style {
		let style = this.pointStyles.get(status);
		if (!style) {
			style = new Style({
				image: new Circle({
					radius: 6,
					fill: new Fill({ color: toneInk(status) }),
					stroke: new Stroke({ color: '#fff', width: 1.5 })
				})
			});
			this.pointStyles.set(status, style);
		}
		return style;
	}

	private clusterStyle(members: Feature<Point>[]): Style {
		const status = this.dominantStatus(members);
		const key = `${status}:${members.length}`;
		let style = this.clusterStyles.get(key);
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
			this.clusterStyles.set(key, style);
		}
		return style;
	}

	private dominantStatus(members: Feature<Point>[]): LuminaireStatus {
		const present = new Set(members.map((member) => (member.get('lamp') as Luminaire).status));
		return SEVERITY_ORDER.find((status) => present.has(status)) ?? 'OK';
	}
}
