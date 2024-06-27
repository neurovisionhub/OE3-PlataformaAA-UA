import { Component, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { BehaviorSubject, Observable, of } from 'rxjs';

import { ChartType } from '../../../../charts/models/chart-type';
import { ChartData } from '../../../../charts/models/chart-data';
import { ChartSeries } from '../../../../charts/models/chart-series';
import { REPORT_DATA } from '../../../../core/statistics/data-report.service';
import { Point, UsageReport } from '../../../../core/statistics/models/usage-report.model';
import { ExportImageType, ExportService } from '../../../../core/export-service/export.service';

@Component({
  selector: 'ds-search-chart-filter',
  template: ``,
})
/**
 * Component that is being injected by wrapper and obtains the report information
 */
export abstract class StatisticsChartDataComponent implements OnInit {

  /**
   * For the ChartType
   */
  chartType: any = ChartType;
  /**
   * Used to set width and height of the chart
   */
  view: any[] = null;
  /**
   * Emits an array of ChartSeries with values found for this chart
   */
  results: Observable<ChartSeries[] | ChartData[]>;
  /**
   * Loading utilized for export functions to disable buttons
   */
  isLoading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  /**
   * Loading utilized for export functions to disable buttons
   */
  isSecondLoading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  /**
   * Chart ElementRef
   */
  @ViewChild('chartRef') chartRef: ElementRef;

  protected exportService: ExportService;

  constructor(
    @Inject(REPORT_DATA) public report: UsageReport,
    @Inject('categoryType') public categoryType: string,
    @Inject(PLATFORM_ID) protected platformId: Object
  ) {

    /* IMPORTANT
       Due to a problem occurring on SSR with the ExportAsService dependency, which use window object, the service can't be injected.
       So we need to instantiate the class directly based on current the platform */
    if (isPlatformBrowser(this.platformId)) {
      import('../../../../core/export-service/browser-export.service').then((s) => {
        this.exportService = new s.BrowserExportService();
      });
    } else {
      import('../../../../core/export-service/server-export.service').then((s) => {
        this.exportService = new s.ServerExportService();
      });
    }
  }

  ngOnInit() {
    this.results = this.getInitData();
  }

  /**
   * Download chart as image in png version.
   */
  downloadPng() {
    this.isLoading.next(false);
    const node = this.chartRef.nativeElement;
    this.exportService.exportAsImage(node, ExportImageType.png, this.report.reportType, this.isLoading);
  }

  /**
   * Download chart as image in jpeg version.
   */
  downloadJpeg() {
    this.isSecondLoading.next(false);
    const node = this.chartRef.nativeElement;
    this.exportService.exportAsImage(node, ExportImageType.jpeg, this.report.reportType, this.isSecondLoading);
  }

  /**
   * Export the table information in excel mode.
   */
  exportExcel() {
    this.isLoading.next(true);
    this.exportService.exportAsFile('xlsx', 'dataTable', this.report.reportType, true).subscribe(() => {
      this.isLoading.next(false);
    });
  }

  /**
   * Export the table information in csv mode.
   */
  exportCsv() {
    this.isSecondLoading.next(true);
    this.exportService.exportAsFile('csv', 'dataTable', this.report.reportType, true).subscribe(() => {
      this.isSecondLoading.next(false);
    });
  }

  /**
   * Parse information as needed by charts can be overriden
   */
  protected getInitData(): Observable<ChartSeries[] | ChartData[]> {
    let key = 'views';

    if (!!this.report.points[0]) {
      key = Object.keys(this.report.points[0].values)[0];
    }

    return of(this.report.points.map(
      (point: Point) => {
        return {
          name: point.label,
          value: point.values[key],
          extra: point,
        };
      }));
  }

}
