import { Component, OnInit } from '@angular/core';
import { BaseMetricComponent } from '../metric-loader/base-metric.component';

@Component({
  selector: 'ds-metric-default',
  templateUrl: './metric-default.component.html',
  styleUrls: ['./metric-default.component.scss', '../metric-loader/base-metric.component.scss'],
})
export class MetricDefaultComponent extends BaseMetricComponent implements OnInit {

  url: string;

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.url = this.getDetailUrl();
  }
}
