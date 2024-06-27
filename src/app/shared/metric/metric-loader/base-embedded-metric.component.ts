import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { interval, Subject } from 'rxjs';
import { take, takeUntil, tap } from 'rxjs/operators';

import { BaseMetricComponent } from './base-metric.component';

export const METRIC_SCRIPT_TIMEOUT_MS = 500;
export const METRIC_SCRIPT_MAX_RETRY = 1;

/**
 * The BaseEmbeddedMetricComponent enhance the basic metric component taking care to run the script required
 * to initialize the dynamically added html snippet.
 */
@Component({
  template: ''
})
export abstract class BaseEmbeddedMetricComponent extends BaseMetricComponent implements OnInit, AfterViewInit {

  timeout = METRIC_SCRIPT_TIMEOUT_MS;
  maxRetry = METRIC_SCRIPT_MAX_RETRY;

  /**
   * Give a context to the script (if supported) to target the metric initialization.
   */
  @ViewChild('metricChild', {static: false}) metricChild;

  sanitizedInnerHtml;

  success = false;

  failed = false;

  protected constructor(protected sr: DomSanitizer) {
    super();
  }

  ngOnInit() {
    if (this.metric && this.metric.remark) {
      this.sanitizedInnerHtml = this.sr.bypassSecurityTrustHtml(this.metric.remark);
    }
  }

  /**
   * When the html content has been initialized, initialize the script.
   */
  ngAfterViewInit() {
    if (this.metric) {
      this.initScript();
    }
  }

  /**
   * Attempt to apply the script.
   * @protected
   */
  initScript() {
    const successNotifier = new Subject<any>();
    interval(this.timeout).pipe(
      tap(() => this.applyScriptHandler(successNotifier)),
      take(this.maxRetry),
      takeUntil(successNotifier),
      ).subscribe({
        complete: () => {
          if (!this.success) {
            this.failed = true;
            this.hide.emit(true);
            console.error('The script of type ' + this.metric.metricType + ' hasn\'t been initialized successfully');
          }
        }
    });
 }

  /**
   * Apply the script and set success true when no error occurs.
   * @param notifier emit and complete in case of success
   */
  applyScriptHandler(notifier: Subject<any>) {
    try {
      this.applyScript();
      this.success = true;
      notifier.next(null);
      notifier.complete();
    } catch (error) {
      console.error('Error applying script for ' + this.metric.metricType + '. Retry');
    }
  }

  /**
   * Apply the script.
   */
  abstract applyScript();

}
