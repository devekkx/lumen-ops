import {
	AfterViewInit,
	Component,
	ElementRef,
	OnDestroy,
	ViewChild,
	computed,
	effect,
	inject,
	signal
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { LanguageService } from '@core/i18n/language.service';
import { LumenNumberPipe } from '@core/i18n/format.pipes';
import { PageHeaderComponent } from '../../layout/page-header.component';
import { toneInk } from '@shared/models/status-tone';
import { DashboardService, DashboardSnapshot } from './dashboard.service';

/* Selective imports only: the full echarts/core bundle pulls in every chart
   and renderer this app never uses. */
echarts.use([
	BarChart,
	LineChart,
	PieChart,
	GridComponent,
	LegendComponent,
	TooltipComponent,
	CanvasRenderer
]);

type RangeKey = '1' | '7' | '30' | '90';

interface RangeOption {
	key: RangeKey;
	labelKey: string;
	hours: number;
}

/* '1' means "24 hours", not "1 day" — it is the mock's hourly-bucket range
   (docs/mock-api.md: a span of 48h or less switches the aggregation from
   daily to hourly buckets), so it is kept a whole hour short of 48h here too. */
const RANGES: readonly RangeOption[] = [
	{ key: '1', labelKey: 'chart.range1', hours: 24 },
	{ key: '7', labelKey: 'chart.range7', hours: 24 * 7 },
	{ key: '30', labelKey: 'chart.range30', hours: 24 * 30 },
	{ key: '90', labelKey: 'chart.range90', hours: 24 * 90 }
];

interface KpiTile {
	key: keyof DashboardSnapshot['kpis'];
	value: number;
	digits: number;
	/* An i18n key rather than translated text, so the tile reads correctly
	   after a language switch without kpiTiles itself depending on the active
	   locale. */
	unitKey?: string;
	suffix?: string;
}

@Component({
	selector: 'lumen-dashboard',
	standalone: true,
	imports: [TranslocoDirective, PageHeaderComponent, LumenNumberPipe],
	templateUrl: './dashboard.component.html',
	styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
	private readonly dashboard = inject(DashboardService);
	private readonly transloco = inject(TranslocoService);
	private readonly language = inject(LanguageService);

	@ViewChild('energy') private readonly energyRef!: ElementRef<HTMLElement>;
	@ViewChild('lamp') private readonly lampRef!: ElementRef<HTMLElement>;
	@ViewChild('severity') private readonly severityRef!: ElementRef<HTMLElement>;

	private energyChart?: echarts.ECharts;
	private lampChart?: echarts.ECharts;
	private severityChart?: echarts.ECharts;

	readonly ranges = RANGES;
	readonly range = signal<RangeKey>('7');
	readonly loading = signal(false);
	readonly snapshot = signal<DashboardSnapshot | null>(null);

	/* "Empty" means no data point worth drawing, not merely an empty array:
	   byLampType and bySeverity always come back with one entry per known
	   lamp type / severity, so a quiet range reports real zeros rather than a
	   short array. Either shape should read as "nothing here" to the user. */
	readonly hasEnergyData = computed(() =>
		(this.snapshot()?.series ?? []).some((point) => point.kwh > 0)
	);
	readonly hasLampData = computed(() =>
		(this.snapshot()?.byLampType ?? []).some((item) => item.kwh > 0)
	);
	readonly hasSeverityData = computed(() =>
		(this.snapshot()?.bySeverity ?? []).some((item) => item.count > 0)
	);

	readonly kpiTiles = computed<KpiTile[]>(() => {
		const data = this.snapshot();
		if (!data) return [];

		return [
			{ key: 'luminaires', value: data.kpis.luminaires, digits: 0 },
			{ key: 'openFaults', value: data.kpis.openFaults, digits: 0 },
			{ key: 'ordersOpen', value: data.kpis.ordersOpen, digits: 0 },
			{ key: 'consumption', value: data.kpis.consumption, digits: 0, unitKey: 'chart.kwh' },
			{ key: 'availability', value: data.kpis.availability, digits: 1, suffix: '%' }
		];
	});

	private readonly onResize = (): void => {
		this.energyChart?.resize();
		this.lampChart?.resize();
		this.severityChart?.resize();
	};

	constructor() {
		/* Re-renders on new data *and* on a language change: the axis labels,
		   legend names and number formatting are all baked into the echarts
		   option objects imperatively, so nothing short of redrawing picks up a
		   locale switch — Transloco's own change detection never touches
		   canvas content it does not own. */
		effect(() => {
			const data = this.snapshot();
			this.language.current();
			if (data) this.renderAll(data);
		});
	}

	ngAfterViewInit(): void {
		window.addEventListener('resize', this.onResize);
		this.load();
	}

	ngOnDestroy(): void {
		window.removeEventListener('resize', this.onResize);
		this.energyChart?.dispose();
		this.lampChart?.dispose();
		this.severityChart?.dispose();
	}

	selectRange(key: RangeKey): void {
		if (key === this.range() || this.loading()) return;
		this.range.set(key);
		this.load();
	}

	private load(): void {
		const option = this.ranges.find((entry) => entry.key === this.range()) ?? this.ranges[0];
		const to = new Date();
		const from = new Date(to.getTime() - option.hours * 3_600_000);

		this.loading.set(true);
		this.dashboard.snapshot({ from: from.toISOString(), to: to.toISOString() }).subscribe({
			next: (data) => {
				this.snapshot.set(data);
				this.loading.set(false);
			},
			/* The api-error interceptor already toasts a translated message and
			   rethrows; this only has to stop the spinner and fall back to the
			   empty state rather than leave stale charts on screen. */
			error: () => {
				this.snapshot.set(null);
				this.loading.set(false);
			}
		});
	}

	private renderAll(data: DashboardSnapshot): void {
		this.renderEnergy(data);
		this.renderLampType(data);
		this.renderSeverity(data);
	}

	private renderEnergy(data: DashboardSnapshot): void {
		const element = this.energyRef?.nativeElement;
		if (!element || !this.hasEnergyData()) return;

		this.energyChart ??= echarts.init(element);
		const t = (key: string) => this.transloco.translate(key);
		const locale = this.language.intlLocale();
		const ink = this.cssVar('--color-primary', '#ff385c');

		this.energyChart.setOption(
			{
				tooltip: { trigger: 'axis' },
				grid: { left: 48, right: 16, top: 24, bottom: 32 },
				xAxis: {
					type: 'category',
					boundaryGap: false,
					data: data.series.map((point) => this.formatBucket(point.t, data.bucketHours, locale))
				},
				yAxis: { type: 'value', name: t('chart.kwh') },
				series: [
					{
						name: t('chart.consumption'),
						type: 'line',
						smooth: true,
						showSymbol: data.series.length <= 25,
						data: data.series.map((point) => point.kwh),
						lineStyle: { color: ink },
						itemStyle: { color: ink },
						areaStyle: { color: ink, opacity: 0.08 }
					}
				]
			},
			true
		);
	}

	private renderLampType(data: DashboardSnapshot): void {
		const element = this.lampRef?.nativeElement;
		if (!element || !this.hasLampData()) return;

		this.lampChart ??= echarts.init(element);
		const t = (key: string) => this.transloco.translate(key);

		this.lampChart.setOption(
			{
				tooltip: { trigger: 'axis' },
				grid: { left: 48, right: 16, top: 24, bottom: 32 },
				xAxis: {
					type: 'category',
					data: data.byLampType.map((item) => t('lamp.' + item.name))
				},
				yAxis: { type: 'value', name: t('chart.kwh') },
				series: [
					{
						name: t('chart.byLampType'),
						type: 'bar',
						barMaxWidth: 48,
						data: data.byLampType.map((item) => ({
							value: item.kwh,
							itemStyle: { color: toneInk(item.name) }
						}))
					}
				]
			},
			true
		);
	}

	private renderSeverity(data: DashboardSnapshot): void {
		const element = this.severityRef?.nativeElement;
		if (!element || !this.hasSeverityData()) return;

		this.severityChart ??= echarts.init(element);
		const t = (key: string) => this.transloco.translate(key);

		this.severityChart.setOption(
			{
				tooltip: { trigger: 'item' },
				legend: { bottom: 0 },
				series: [
					{
						name: t('chart.bySeverity'),
						type: 'pie',
						radius: ['40%', '70%'],
						data: data.bySeverity.map((item) => ({
							name: t('severity.' + item.name),
							value: item.count,
							itemStyle: { color: toneInk(item.name) }
						}))
					}
				]
			},
			true
		);
	}

	private formatBucket(t: number, bucketHours: number, locale: string): string {
		const options: Intl.DateTimeFormatOptions =
			bucketHours <= 1 ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' };
		return new Intl.DateTimeFormat(locale, options).format(new Date(t));
	}

	private cssVar(name: string, fallback: string): string {
		const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
		return value || fallback;
	}
}
