import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

@Component({ standalone: true, template: `<section><div class="mb-4"><p class="text-uppercase text-secondary small mb-1">Operations overview</p><h1>Energy dashboard</h1></div><div class="row g-3"><div class="col-lg-12"><div class="card"><div #energy class="chart"></div></div></div><div class="col-md-6"><div class="card"><div #lamp class="chart"></div></div></div><div class="col-md-6"><div class="card"><div #severity class="chart"></div></div></div></div></section>`, styles: ['.chart { height: 320px; width: 100%; }'] })
export class DashboardComponent implements AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient); private charts: echarts.ECharts[] = [];
  @ViewChild('energy') energy!: ElementRef<HTMLElement>; @ViewChild('lamp') lamp!: ElementRef<HTMLElement>; @ViewChild('severity') severity!: ElementRef<HTMLElement>;
  ngAfterViewInit(): void { this.http.get<any>('/api/dashboard/summary').subscribe((data) => { this.charts = [this.draw(this.energy.nativeElement, { title: { text: 'Consumption (kWh)' }, tooltip: {}, xAxis: { type: 'category', data: data.energy.map((x: any) => x.at) }, yAxis: { type: 'value' }, series: [{ type: 'line', data: data.energy.map((x: any) => x.kwh), smooth: true }] }), this.draw(this.lamp.nativeElement, { title: { text: 'Assets by lamp type' }, tooltip: {}, xAxis: { type: 'category', data: data.byLampType.map((x: any) => x.name) }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: data.byLampType.map((x: any) => x.value) }] }), this.draw(this.severity.nativeElement, { title: { text: 'Fault severity' }, tooltip: {}, series: [{ type: 'pie', data: data.bySeverity }] })]; }); }
  private draw(element: HTMLElement, option: any): echarts.ECharts { const chart = echarts.init(element); chart.setOption(option); return chart; }
  ngOnDestroy(): void { this.charts.forEach((chart) => chart.dispose()); }
}
