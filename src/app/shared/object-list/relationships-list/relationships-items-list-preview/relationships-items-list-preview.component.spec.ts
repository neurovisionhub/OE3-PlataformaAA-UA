import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelationshipsItemsListPreviewComponent } from './relationships-items-list-preview.component';
import { VarDirective } from '../../../utils/var.directive';

describe('RelationshipsItemsListPreviewComponent', () => {
  let component: RelationshipsItemsListPreviewComponent;
  let fixture: ComponentFixture<RelationshipsItemsListPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RelationshipsItemsListPreviewComponent, VarDirective ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RelationshipsItemsListPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
