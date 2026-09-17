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
	private readonly _dashboard = inject(DashboardService);
	private readonly _transloco = inject(TranslocoService);
	private readonly _language = inject(LanguageService);
	private readonly _hostRef = inject(ElementRef<HTMLElement>);

	@ViewChild('energy') private readonly _energyRef!: ElementRef<HTMLElement>;
	@ViewChild('lamp') private readonly _lampRef!: ElementRef<HTMLElement>;
	@ViewChild('severity') private readonly _severityRef!: ElementRef<HTMLElement>;

	private _energyChart?: echarts.ECharts;
	private _lampChart?: echarts.ECharts;
	private _severityChart?: echarts.ECharts;

	readonly ranges = RANGES;
	readonly range = signal<RangeKey>('7');
	readonly loading = signal(false);
	readonly snapshot = signal<DashboardSnapshot | null>(null);

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

	private readonly _onResize = (): void => {
		this._energyChart?.resize();
		this._lampChart?.resize();
		this._severityChart?.resize();
	};

	private _resizeObserver?: ResizeObserver;

	constructor() {
		effect(() => {
			const data = this.snapshot();
			this._language.current();
			if (data) this._renderAll(data);
		});
	}

	ngAfterViewInit(): void {
		window.addEventListener('resize', this._onResize);
		this._resizeObserver = new ResizeObserver(() => this._onResize());
		this._resizeObserver.observe(this._hostRef.nativeElement);
		this._load();
	}

	ngOnDestroy(): void {
		window.removeEventListener('resize', this._onResize);
		this._resizeObserver?.disconnect();
		this._energyChart?.dispose();
		this._lampChart?.dispose();
		this._severityChart?.dispose();
	}

	selectRange(key: RangeKey): void {
		if (key === this.range() || this.loading()) return;
		this.range.set(key);
		this._load();
	}

	private _load(): void {
		const option = this.ranges.find((entry) => entry.key === this.range()) ?? this.ranges[0];
		const to = new Date();
		const from = new Date(to.getTime() - option.hours * 3_600_000);

		this.loading.set(true);
		this._dashboard.snapshot({ from: from.toISOString(), to: to.toISOString() }).subscribe({
			next: (data) => {
				this.snapshot.set(data);
				this.loading.set(false);
			},
			error: () => {
				this.snapshot.set(null);
				this.loading.set(false);
			}
		});
	}

	private _renderAll(data: DashboardSnapshot): void {
		this._renderEnergy(data);
		this._renderLampType(data);
		this._renderSeverity(data);

		requestAnimationFrame(() => {
			this._energyChart?.resize();
			this._lampChart?.resize();
			this._severityChart?.resize();
		});
	}

	private _renderEnergy(data: DashboardSnapshot): void {
		const element = this._energyRef?.nativeElement;
		if (!element || !this.hasEnergyData()) return;

		this._energyChart ??= echarts.init(element);
		const t = (key: string) => this._transloco.translate(key);
		const locale = this._language.intlLocale();
		const ink = this._cssVar('--color-primary', '#ff385c');

		this._energyChart.setOption(
			{
				tooltip: { trigger: 'axis', appendToBody: true, confine: true },
				grid: { left: 48, right: 16, top: 24, bottom: 32 },
				xAxis: {
					type: 'category',
					boundaryGap: false,
					data: data.series.map((point) => this._formatBucket(point.t, data.bucketHours, locale))
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

	private _renderLampType(data: DashboardSnapshot): void {
		const element = this._lampRef?.nativeElement;
		if (!element || !this.hasLampData()) return;

		this._lampChart ??= echarts.init(element);
		const t = (key: string) => this._transloco.translate(key);

		this._lampChart.setOption(
			{
				tooltip: { trigger: 'axis', appendToBody: true, confine: true },
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

	private _renderSeverity(data: DashboardSnapshot): void {
		const element = this._severityRef?.nativeElement;
		if (!element || !this.hasSeverityData()) return;

		this._severityChart ??= echarts.init(element);
		const t = (key: string) => this._transloco.translate(key);

		this._severityChart.setOption(
			{
				tooltip: { trigger: 'item', appendToBody: true, confine: true },
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

	private _formatBucket(t: number, bucketHours: number, locale: string): string {
		const options: Intl.DateTimeFormatOptions =
			bucketHours <= 1
				? { hour: '2-digit', minute: '2-digit' }
				: { day: 'numeric', month: 'short' };
		return new Intl.DateTimeFormat(locale, options).format(new Date(t));
	}

	private _cssVar(name: string, fallback: string): string {
		const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
		return value || fallback;
	}
}
