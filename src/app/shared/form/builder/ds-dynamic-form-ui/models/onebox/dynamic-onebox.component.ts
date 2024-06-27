import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';

import {
  DynamicFormControlCustomEvent,
  DynamicFormLayoutService,
  DynamicFormValidationService
} from '@ng-dynamic-forms/core';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  switchMap,
  take,
  tap
} from 'rxjs/operators';
import { Observable, of as observableOf, Subject, Subscription } from 'rxjs';
import { NgbModal, NgbModalRef, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';

import { VocabularyService } from '../../../../../../core/submission/vocabularies/vocabulary.service';
import { DynamicOneboxModel } from './dynamic-onebox.model';
import { hasValue, isEmpty, isNotEmpty, isNotNull } from '../../../../../empty.util';
import { FormFieldMetadataValueObject } from '../../../models/form-field-metadata-value.model';
import { ConfidenceType } from '../../../../../../core/shared/confidence-type';
import { getFirstSucceededRemoteDataPayload } from '../../../../../../core/shared/operators';
import { buildPaginatedList, PaginatedList } from '../../../../../../core/data/paginated-list.model';
import { VocabularyEntry } from '../../../../../../core/submission/vocabularies/models/vocabulary-entry.model';
import { PageInfo } from '../../../../../../core/shared/page-info.model';
import { DsDynamicVocabularyComponent } from '../dynamic-vocabulary.component';
import { Vocabulary } from '../../../../../../core/submission/vocabularies/models/vocabulary.model';
import { VocabularyTreeviewComponent } from '../../../../vocabulary-treeview/vocabulary-treeview.component';
import { FormBuilderService } from '../../../form-builder.service';
import { SubmissionService } from '../../../../../../submission/submission.service';

/**
 * Component representing a onebox input field.
 * If field has a Hierarchical Vocabulary configured, it's rendered with vocabulary tree
 */
@Component({
  selector: 'ds-dynamic-onebox',
  styleUrls: ['./dynamic-onebox.component.scss'],
  templateUrl: './dynamic-onebox.component.html'
})
export class DsDynamicOneboxComponent extends DsDynamicVocabularyComponent implements OnInit {

  @Input() group: FormGroup;
  @Input() model: DynamicOneboxModel;

  @Output() blur: EventEmitter<any> = new EventEmitter<any>();
  @Output() change: EventEmitter<any> = new EventEmitter<any>();
  @Output() focus: EventEmitter<any> = new EventEmitter<any>();
  @Output() customEvent: EventEmitter<DynamicFormControlCustomEvent> = new EventEmitter();

  @ViewChild('instance') instance: NgbTypeahead;

  pageInfo: PageInfo = new PageInfo();
  searching = false;
  searchFailed = false;
  hideSearchingWhenUnsubscribed$ = new Observable(() => () => this.changeSearchingStatus(false));
  click$ = new Subject<string>();
  currentValue: any;
  previousValue: any;
  inputValue: any;
  preloadLevel: number;

  private isHierarchicalVocabulary$: Observable<boolean>;
  private subs: Subscription[] = [];

  constructor(protected vocabularyService: VocabularyService,
              protected cdr: ChangeDetectorRef,
              protected layoutService: DynamicFormLayoutService,
              protected modalService: NgbModal,
              protected validationService: DynamicFormValidationService,
              protected formBuilderService: FormBuilderService,
              protected submissionService: SubmissionService
  ) {
    super(vocabularyService, layoutService, validationService, formBuilderService, modalService, submissionService);
  }

  /**
   * Converts an item from the result list to a `string` to display in the `<input>` field.
   */
  formatter = (x: { display: string }) => {
    return (typeof x === 'object') ? x.display : x;
  };

  /**
   * Converts a stream of text values from the `<input>` element to the stream of the array of items
   * to display in the onebox popup.
   */
  search = (text$: Observable<string>) => {
    return text$.pipe(
      merge(this.click$),
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.changeSearchingStatus(true)),
      switchMap((term) => {
        if (term === '' || term.length < this.model.minChars) {
          return observableOf({list: []});
        } else {
          return this.vocabularyService.getVocabularyEntriesByValue(
            term,
            false,
            this.model.vocabularyOptions,
            this.pageInfo).pipe(
            getFirstSucceededRemoteDataPayload(),
            tap(() => this.searchFailed = false),
            catchError(() => {
              this.searchFailed = true;
              return observableOf(buildPaginatedList(
                new PageInfo(),
                []
              ));
            }));
        }
      }),
      map((list: PaginatedList<VocabularyEntry>) => list.page),
      tap(() => this.changeSearchingStatus(false)),
      merge(this.hideSearchingWhenUnsubscribed$)
    );
  };

  /**
   * Initialize the component, setting up the init form value
   */
  ngOnInit() {
    this.initVocabulary();
    this.isHierarchicalVocabulary$ = this.vocabulary$.pipe(
      filter((vocabulary: Vocabulary) => isNotEmpty(vocabulary)),
      map((vocabulary: Vocabulary) => vocabulary.hierarchical),
      tap((isHierarchical: boolean) => {
        if (this.model.value) {
          this.setCurrentValue(this.model.value, isHierarchical);
        }
      })
    );
    this.subs.push(this.group.get(this.model.id).valueChanges.pipe(
      filter((value) => this.currentValue !== value))
      .subscribe((value) => {
        this.setCurrentValue(this.model.value);
      }));
  }

  /**
   * Changes the searching status
   * @param status
   */
  changeSearchingStatus(status: boolean) {
    this.searching = status;
    this.cdr.detectChanges();
  }

  /**
   * Checks if configured vocabulary is Hierarchical or not
   */
  isHierarchicalVocabulary(): Observable<boolean> {
    return this.isHierarchicalVocabulary$;
  }

  /**
   * Update the input value with a FormFieldMetadataValueObject
   * @param event
   */
  onInput(event) {
        if (!this.model.vocabularyOptions.closed && isNotEmpty(event.target.value)) {
      this.inputValue = new FormFieldMetadataValueObject(event.target.value);
      if (this.model.value) {
        if ((this.model.value as any).securityLevel != null) {
          this.inputValue.securityLevel = (this.model.value as any).securityLevel;
        }
      }
    }
  }

  /**
   * Emits a blur event containing a given value.
   * @param event The value to emit.
   */
  onBlur(event: Event) {
    if (!this.instance.isPopupOpen()) {
      if (!this.model.vocabularyOptions.closed && isNotEmpty(this.inputValue)) {
        if (isNotNull(this.inputValue) && this.model.value !== this.inputValue) {
          this.dispatchUpdate(this.inputValue);
        }
         this.inputValue = null;
      }
      this.blur.emit(event);
    } else {
      // prevent on blur propagation if typeahed suggestions are showed
      event.preventDefault();
      event.stopImmediatePropagation();
      // set focus on input again, this is to avoid to lose changes when no suggestion is selected
      (event.target as HTMLInputElement).focus();
    }
  }

  /**
   * Updates model value with the current value
   * @param event The change event.
   */
  onChange(event: Event) {
    if (!this.previousValue && !isEmpty(this.currentValue)) {
      if (this.model.securityConfigLevel &&  this.model.securityConfigLevel.length > 0) {
        this.model.securityLevel = this.model.securityConfigLevel[this.model.securityConfigLevel.length - 1];
      }
    }
    event.stopPropagation();
    if (isEmpty(this.currentValue)) {
      this.dispatchUpdate(null);
    }
  }

  /**
   * Updates current value and model value with the selected value.
   * @param event The value to set.
   */
  onSelectItem(event: NgbTypeaheadSelectItemEvent) {
    this.inputValue = null;
    this.setCurrentValue(event.item);
    this.dispatchUpdate(event.item);
  }

  /**
   * Open modal to show tree for hierarchical vocabulary
   * @param event The click event fired
   */
  openTree(event) {
    if (this.model.readOnly) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.subs.push(this.vocabulary$.pipe(
      map((vocabulary: Vocabulary) => vocabulary.preloadLevel),
      take(1)
    ).subscribe((preloadLevel) => {
      const modalRef: NgbModalRef = this.modalService.open(VocabularyTreeviewComponent, {
        size: 'lg',
        windowClass: 'treeview'
      });
      modalRef.componentInstance.vocabularyOptions = this.model.vocabularyOptions;
      modalRef.componentInstance.preloadLevel = preloadLevel;
      modalRef.componentInstance.selectedItem = this.currentValue ? this.currentValue : '';
      modalRef.result.then((result: FormFieldMetadataValueObject) => {
        if (result) {
          this.currentValue = result;
          this.previousValue = result;
          this.dispatchUpdate(result);
        }
      }, () => {
        return;
      });
    }));
  }

  /**
   * Callback functions for whenClickOnConfidenceNotAccepted event
   */
  public whenClickOnConfidenceNotAccepted(confidence: ConfidenceType) {
    if (!this.model.readOnly) {
      this.click$.next(this.formatter(this.currentValue));
    }
  }

  /**
   * Sets the current value with the given value.
   * @param value The value to set.
   * @param init Representing if is init value or not.
   */
  setCurrentValue(value: any, init = false): void {
    let result: string;
    if (init) {
      this.getInitValueFromModel()
        .subscribe((formValue: FormFieldMetadataValueObject) => {
          this.currentValue = formValue;
          this.previousValue = formValue;
          this.cdr.detectChanges();
        });
    } else {
      if (isEmpty(value)) {
        result = '';
      } else {
        result = value;
      }

      this.currentValue = result;
      this.previousValue = result;
      this.cdr.detectChanges();
    }

  }

  /**
   * Get the other information value removing the authority section (after the last ::)
   * @param itemValue the initial item value
   */
  getOtherInfoValue(itemValue: string): string {
    if (!itemValue || !itemValue.includes('::')) {
      return itemValue;
    }
    return itemValue.substring(0, itemValue.lastIndexOf('::'));
  }

  ngOnDestroy(): void {
    this.subs
      .filter((sub) => hasValue(sub))
      .forEach((sub) => sub.unsubscribe());
  }
}
