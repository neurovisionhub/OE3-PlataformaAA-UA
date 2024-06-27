import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, inject, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule, By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { RemoteData } from '../../../../core/data/remote-data';
import { SearchService } from '../../../../core/shared/search/search.service';
import { TranslateLoaderMock } from '../../../mocks/translate-loader.mock';
import { createSuccessfulRemoteDataObject$ } from '../../../remote-data.utils';
import { SearchSectionComponent } from './search-section.component';
import { Router } from '@angular/router';
import { SearchConfig } from '../../../search/search-filters/search-config.model';
import { SearchConfigurationService } from '../../../../core/shared/search/search-configuration.service';

describe('SearchSectionComponent', () => {
  let component: SearchSectionComponent;
  let fixture: ComponentFixture<SearchSectionComponent>;

  let searchServiceStub: any;
  let searchConfigurationStub: any;
  let router: any;

  const firstFilterConfig: any = {
    filter: 'author',
    hasFacets: true,
    operators: [],
    openByDefault: true,
    pageSize: 5,
    type: 'text'
  };

  const secondFilterConfig: any = {
    filter: 'subject',
    hasFacets: true,
    operators: [],
    openByDefault: true,
    pageSize: 5,
    type: 'text'
  };

  beforeEach(waitForAsync(() => {

    searchServiceStub = {
      getSearchLink(): string {
        return '/search';
      }
    };
    searchConfigurationStub = {
      getSearchConfigurationFor( scope?: string, configurationName?: string ): Observable<RemoteData<SearchConfig>> {
        const config = new SearchConfig();
        config.filters = [firstFilterConfig, secondFilterConfig];
        return createSuccessfulRemoteDataObject$(config);
      }
    };

    router = {
      navigate: jasmine.createSpy('navigate')
    };

    TestBed.configureTestingModule({
      imports: [CommonModule, NgbModule, FormsModule, ReactiveFormsModule, BrowserModule, RouterTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateLoaderMock
          }
        }),
      ],
      declarations: [SearchSectionComponent],
      providers: [SearchSectionComponent,
        { provide: SearchService, useValue: searchServiceStub },
        { provide: SearchConfigurationService, useValue: searchConfigurationStub },
        { provide: Router, useValue: router }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchSectionComponent);
    component = fixture.componentInstance;

    component.sectionId = 'publications';
    component.searchSection = {
      discoveryConfigurationName: 'publication',
      componentType: 'search',
      style: 'col-md-8',
      searchType: 'advanced',
      initialStatements: 3,
      displayTitle: false
    };

    fixture.detectChanges();
  });

  it('should create SearchSetionComponent', inject([SearchSectionComponent], (comp: SearchSectionComponent) => {
    expect(comp).toBeDefined();
  }));

  it('should create an empty form with three rows',  () => {
    const formRows = fixture.debugElement.queryAll(By.css('[data-test="form-row"]'));
    expect(formRows.length).toEqual(3);

    for (const formRow of formRows) {
      const filterSelect = formRow.query(By.css('#filter'));
      expect(filterSelect).not.toBeNull();
      const filterOptions = filterSelect.children;
      expect(filterOptions.length).toEqual(3);
      expect(filterOptions.map((el) => el.nativeElement.value)).toEqual(['all','author','subject']);

      const queryInput = formRow.query(By.css('#query'));
      expect(queryInput).not.toBeNull();
      expect(queryInput.nativeElement.value).toEqual('');

      const isLastRow = formRows.indexOf(formRow) === 2;
      if ( isLastRow ) {
        expect(formRow.query(By.css('#addButton'))).not.toBeNull();
        expect(formRow.query(By.css('#operation'))).toBeNull();
      } else {
        const operationSelect = formRow.query(By.css('#operation'));
        expect(operationSelect).not.toBeNull();
        const operationOptions = operationSelect.children;
        expect(operationOptions.length).toEqual(3);
        expect(operationOptions.map((el) => el.nativeElement.value)).toEqual(['AND','OR','NOT']);
        expect(formRow.query(By.css('#addButton'))).toBeNull();
      }
    }

    expect(fixture.debugElement.queryAll(By.css('#resetButton'))).not.toBeNull();
    expect(fixture.debugElement.queryAll(By.css('#searchButton'))).not.toBeNull();
  });

  describe('when you click on the add button', () => {
    beforeEach(fakeAsync(() => {
      fixture.debugElement.query(By.css('#addButton')).nativeElement.click();
      tick();
      fixture.detectChanges();
    }));

    it('should add a row in the form', () => {
      const formRows = fixture.debugElement.queryAll(By.css('[data-test="form-row"]'));
      expect(formRows.length).toEqual(4);
    });
  });

  describe('when you click on the reset button', () => {

    beforeEach(() => {
      const firstFormRow = fixture.debugElement.queryAll(By.css('[data-test="form-row"]'))[0];
      const filterSelect = firstFormRow.query(By.css('#filter'));
      filterSelect.nativeElement.value = 'author';
      const queryInput = firstFormRow.query(By.css('#query'));
      queryInput.nativeElement.value = 'Adam';
      fixture.detectChanges();
    });

    beforeEach(fakeAsync(() => {
      fixture.debugElement.query(By.css('#resetButton')).nativeElement.click();
      tick();
      fixture.detectChanges();
    }));

    it('should reset the form', () => {
      const formRows = fixture.debugElement.queryAll(By.css('[data-test="form-row"]'));
      expect(formRows.length).toEqual(3);
      const firstFormRow = fixture.debugElement.queryAll(By.css('[data-test="form-row"]'))[0];
      const filterSelect = firstFormRow.query(By.css('#filter'));
      expect(filterSelect.nativeElement.value).toEqual('all');
      const queryInput = firstFormRow.query(By.css('#query'));
      expect(queryInput.nativeElement.value).toEqual('');
    });
  });

  describe('when you click on the search button', () => {

    beforeEach(() => {
      const firstFormRow = fixture.debugElement.queryAll(By.css('[data-test="form-row"]'))[0];
      const filterSelect = firstFormRow.query(By.css('#filter')).nativeElement;
      filterSelect.value = 'author';
      filterSelect.dispatchEvent(new Event('change'));
      const firstQueryInput = firstFormRow.query(By.css('#query')).nativeElement;
      firstQueryInput.value = 'Adam';
      firstQueryInput.dispatchEvent(new Event('input'));
      const operationInput = firstFormRow.query(By.css('#operation')).nativeElement;
      operationInput.value = 'OR';
      operationInput.dispatchEvent(new Event('change'));
      const secondFormRow = fixture.debugElement.queryAll(By.css('[data-test="form-row"]'))[1];

      const secondQueryInput = secondFormRow.query(By.css('#query')).nativeElement;
      secondQueryInput.value = 'test';
      secondQueryInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    });

    beforeEach(fakeAsync(() => {
      fixture.debugElement.query(By.css('#searchButton')).nativeElement.click();
      tick();
      fixture.detectChanges();
    }));

    it('should redirect to the search page with the composed query', () => {
      expect(router.navigate).toHaveBeenCalledWith(['/search'], {
        queryParams: { page: 1, configuration: 'publication', query: 'author:(Adam) OR (test)' }
      });
    });
  });

  describe('when basic search is configured', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(SearchSectionComponent);
      component = fixture.componentInstance;

      component.sectionId = 'publications';
      component.searchSection = {
        discoveryConfigurationName: 'publication',
        componentType: 'search',
        style: 'col-md-8',
        searchType: 'basic',
        initialStatements: 3,
        displayTitle: false
      };

      fixture.detectChanges();
    });

    it('should display basic search form', () => {
      expect(fixture.debugElement.query(By.css('ds-search-form')))
      .toBeTruthy();
    });

  });

});
