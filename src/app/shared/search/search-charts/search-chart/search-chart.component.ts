import { Component, Inject, Input, OnInit, SimpleChanges } from '@angular/core';

import { BehaviorSubject, Observable, of as observableOf } from 'rxjs';
import { filter, map, startWith, switchMap, take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { SEARCH_CONFIG_SERVICE } from '../../../../my-dspace-page/my-dspace-page.component';
import { SearchConfigurationService } from '../../../../core/shared/search/search-configuration.service';
import { SearchFilterService } from '../../../../core/shared/search/search-filter.service';
import { SearchService } from '../../../../core/shared/search/search.service';
import { isNotEmpty } from '../../../empty.util';
import { SearchFilterConfig } from '../../models/search-filter-config.model';

@Component({
  selector: 'ds-search-chart',
  styleUrls: ['./search-chart.component.scss'],
  templateUrl: './search-chart.component.html'
})

/**
 * Represents a part of the filter charts tabs for a single type of chart filter
 */
export class SearchChartComponent implements OnInit {
  /**
   * The filter config for this component
   */
  @Input() filter: SearchFilterConfig;

  /**
   * True when the search component should show results on the current page
   */
  @Input() inPlaceSearch;

  /**
   * Emits when the search filters values may be stale, and so they must be refreshed.
   */
  @Input() refreshFilters: BehaviorSubject<boolean>;

  /**
   * Emits all currently selected values for this filter
   */
  selectedValues$: Observable<string[]>;

  /**
   * Emits true when the current filter is supposed to be shown
   */
  active$: Observable<boolean>;

  /**
   * True if the caption is present in the language file
   */
  showCaption: boolean;

  /**
   * The text to be shown below the graph
   */
  caption: string;

  constructor(
    private filterService: SearchFilterService,
    private searchService: SearchService,
    private translate: TranslateService,
    @Inject(SEARCH_CONFIG_SERVICE) private searchConfigService: SearchConfigurationService,
  ) {}

  /**
   * Requests the current set values for this filter
   * If the filter config is open by default OR the filter has at least one value, the filter should be initially expanded
   * Else, the filter should initially be collapsed
   *
   * It is possible to define a caption to be shown below the chart by creating a translation key
   * 'search.filters.applied.charts.caption.<TYPE>.<NAME>'
   */
  ngOnInit() {
    const captionTranslationLabel = `search.filters.applied.charts.caption.${this.filter.name}`;
    this.caption = this.translate.instant(captionTranslationLabel);
    this.showCaption = this.caption !== captionTranslationLabel;

    this.selectedValues$ = this.getSelectedValues();
    this.active$ = this.isActive();
    this.initializeFilter();
    this.selectedValues$.pipe(take(1)).subscribe((selectedValues) => {
      if (isNotEmpty(selectedValues)) {
        this.filterService.expand(this.filter.name);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.filter = changes.filter.currentValue;
    this.ngOnInit();
  }

  /**
   *  Sets the initial state of the filter
   */
  initializeFilter() {
    this.filterService.initializeFilter(this.filter);
  }

  /**
   * @returns {Observable<string[]>} Emits a list of all values that are currently active for this filter
   */
  private getSelectedValues(): Observable<string[]> {
    return this.filterService.getSelectedValuesForFilter(this.filter);
  }

  /**
   * Check if a given filter is supposed to be shown or not
   * @returns {Observable<boolean>} Emits true whenever a given filter config should be shown
   */
  private isActive(): Observable<boolean> {
    return this.selectedValues$.pipe(
      switchMap((isActive) => {
        if (isNotEmpty(isActive)) {
          return observableOf(true);
        } else {
          return this.searchConfigService.searchOptions.pipe(
            switchMap((options) => {
                return this.searchService.getFacetValuesFor(this.filter, 1, options).pipe(
                  filter((RD) => !RD.isLoading),
                  map((valuesRD) => {
                    return valuesRD.payload.totalElements > 0;
                  }));
              }
            ));
        }
      }),
      startWith(true));
  }
}
