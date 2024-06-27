import { Component, Inject, Input, OnInit } from '@angular/core';

import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { NativeWindowRef, NativeWindowService } from '../../../../core/services/window.service';
import { DSpaceObject } from '../../../../core/shared/dspace-object.model';
import { SearchObjects } from '../../../search/models/search-objects.model';
import { getFirstSucceededRemoteDataPayload } from '../../../../core/shared/operators';
import { PaginationComponentOptions } from '../../../pagination/pagination-component-options.model';
import { SectionComponent } from '../../../../core/layout/models/section.model';
import { SearchService } from '../../../../core/shared/search/search.service';
import { PaginatedSearchOptions } from '../../../search/models/paginated-search-options.model';
import { hasValue } from '../../../empty.util';
import { UUIDService } from '../../../../core/shared/uuid.service';

@Component({
  selector: 'ds-counters-section',
  templateUrl: './counters-section.component.html'
})
export class CountersSectionComponent implements OnInit {

  @Input()
  sectionId: string;

  @Input()
  countersSection: CountersSection;

  counterData: CounterData[] = [];
  counterData$: Observable<CounterData[]>;
  isLoading$ = new BehaviorSubject(true);

  pagination: PaginationComponentOptions = Object.assign(new PaginationComponentOptions(), {
    id: this.uuidService.generate(),
    pageSize: 1,
    currentPage: 1
  });


  constructor(private searchService: SearchService,
              private uuidService: UUIDService,
              @Inject(NativeWindowService) protected _window: NativeWindowRef) {

  }

  ngOnInit() {
    this.counterData$ = forkJoin(
      this.countersSection.counterSettingsList.map((counterSettings: CountersSettings) =>
        this.searchService.search(new PaginatedSearchOptions({
          configuration: counterSettings.discoveryConfigurationName,
          pagination: this.pagination})).pipe(
          getFirstSucceededRemoteDataPayload(),
          map((rs: SearchObjects<DSpaceObject>) => rs.totalElements),
          map((total: number) => {
            return {
              count: total.toString(),
              label: counterSettings.entityName,
              icon: counterSettings.icon,
              link: counterSettings.link

            };
          })
        )));
    this.counterData$.subscribe(() => this.isLoading$.next(false));
  }

  goToLink(link: string) {
    if (hasValue(link)) {
      this._window.nativeWindow.location.href = link;
    }
  }
}



export interface CountersSection extends SectionComponent {
  componentType: 'counters';
  counterSettingsList: CountersSettings[];
}

export interface CountersSettings {
  discoveryConfigurationName: string;
  entityName: string;
  icon: string;
  link: string;
}

export interface CounterData {
  label: string;
  count: string;
  icon: string;
  link: string;
}
