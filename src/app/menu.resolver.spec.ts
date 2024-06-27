import { TestBed, waitForAsync } from '@angular/core/testing';

import { MenuResolver } from './menu.resolver';
import { of as observableOf } from 'rxjs';
import { FeatureID } from './core/data/feature-authorization/feature-id';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminSidebarComponent } from './admin/admin-sidebar/admin-sidebar.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MenuService } from './shared/menu/menu.service';
import { AuthorizationDataService } from './core/data/feature-authorization/authorization-data.service';
import { ScriptDataService } from './core/data/processes/script-data.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MenuServiceStub } from './shared/testing/menu-service.stub';
import { MenuID } from './shared/menu/menu-id.model';
import { cold } from 'jasmine-marbles';
import { createSuccessfulRemoteDataObject$ } from './shared/remote-data.utils';
import { createPaginatedList } from './shared/testing/utils.test';
import { SectionDataService } from './core/layout/section-data.service';
import createSpy = jasmine.createSpy;

const BOOLEAN = { t: true, f: false };
const MENU_STATE = {
  id: 'some menu'
};
const EXPLORE_SECTIONS_DEFINITIONS = [
  { id: 'definition1' },
  {
    id: 'definition2',
    nestedSections: [
      { id: 'definition1' },
      { id: 'definition2' }
    ]
  },
  { id: 'definition3' },
];

const ALL_FLAT_MENUS = [
  { id: 'definition1' },
  { id: 'definition2' },
  { id: 'definition3' },
];
const ALL_NESTED_MENUS = [
  {
    id: 'definition1',
    nestedSections: [
      { id: 'definition1' },
    ]
  },{
    id: 'definition2',
    nestedSections: [
      { id: 'definition2' },
    ]
  },{
    id: 'definition3',
    nestedSections: [
      { id: 'definition3' },
    ]
  }
];
const NO_MENUS = [];

describe('MenuResolver', () => {
  let resolver: MenuResolver;

  let menuService;
  let sectionsService;
  let authorizationService;
  let scriptService;

  beforeEach(waitForAsync(() => {
    menuService = new MenuServiceStub();
    spyOn(menuService, 'getMenu').and.returnValue(observableOf(MENU_STATE));

    sectionsService = jasmine.createSpyObj('SectionDataService', {
      findVisibleSections: createSuccessfulRemoteDataObject$(createPaginatedList(EXPLORE_SECTIONS_DEFINITIONS))
    });
    authorizationService = jasmine.createSpyObj('authorizationService', {
      isAuthorized: observableOf(true)
    });
    scriptService = jasmine.createSpyObj('scriptService', {
      scriptWithNameExistsAndCanExecute: observableOf(true)
    });

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), NoopAnimationsModule, RouterTestingModule],
      declarations: [AdminSidebarComponent],
      providers: [
        { provide: MenuService, useValue: menuService },
        { provide: SectionDataService, useValue: sectionsService },
        { provide: AuthorizationDataService, useValue: authorizationService },
        { provide: ScriptDataService, useValue: scriptService },
        {
          provide: NgbModal, useValue: {
            open: () => {/*comment*/
            }
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    resolver = TestBed.inject(MenuResolver);

    spyOn(menuService, 'addSection');
  }));

  it('should be created', () => {
    expect(resolver).toBeTruthy();
  });

  describe('resolve', () => {
    it('should create all menus', (done) => {
      spyOn(resolver, 'createPublicMenu$').and.returnValue(observableOf(true));
      spyOn(resolver, 'createAdminMenu$').and.returnValue(observableOf(true));

      resolver.resolve(null, null).subscribe(resolved => {
        expect(resolved).toBeTrue();
        expect(resolver.createPublicMenu$).toHaveBeenCalled();
        expect(resolver.createAdminMenu$).toHaveBeenCalled();
        done();
      });
    });

    it('should return an Observable that emits true as soon as all menus are created', () => {
      spyOn(resolver, 'createPublicMenu$').and.returnValue(cold('--(t|)', BOOLEAN));
      spyOn(resolver, 'createAdminMenu$').and.returnValue(cold('----(t|)', BOOLEAN));

      expect(resolver.resolve(null, null)).toBeObservable(cold('----(t|)', BOOLEAN));
    });
  });

  describe('createPublicMenu$', () => {
    it('should retrieve the menu by ID return an Observable that emits true as soon as it is created', () => {
      (menuService as any).getMenu.and.returnValue(cold('--u--m--', {
        u: undefined,
        m: MENU_STATE,
      }));

      expect(resolver.createPublicMenu$()).toBeObservable(cold('-----(t|)', BOOLEAN));
      expect(menuService.getMenu).toHaveBeenCalledOnceWith(MenuID.PUBLIC);
    });

    describe('contents', () => {
      beforeEach((done) => {
        resolver.createPublicMenu$().subscribe((_) => {
          done();
        });
      });

      it('should include community list link', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.PUBLIC, jasmine.objectContaining({
          id: 'browse_global_communities_and_collections', visible: true,
        }));
      });

      it('should include explore sections', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.PUBLIC, jasmine.objectContaining({
          id: 'explore_definition1', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.PUBLIC, jasmine.objectContaining({
          id: 'explore_definition2', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.PUBLIC, jasmine.objectContaining({
          id: 'explore_nested_definition2',
          parentID: 'explore_definition2',
          active: false,
          visible: true
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.PUBLIC, jasmine.objectContaining({
          id: 'explore_definition3', visible: true,
        }));
      });
    });

    describe('handle menus', () => {
      it('should show all flat menus', () => {
        sectionsService.findVisibleSections.and.returnValue(
          createSuccessfulRemoteDataObject$(createPaginatedList(ALL_FLAT_MENUS))
        );
        resolver.createPublicMenu$().subscribe();
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.PUBLIC, jasmine.objectContaining({
          id: 'explore_definition1', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.PUBLIC, jasmine.objectContaining({
          id: 'explore_definition2', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.PUBLIC, jasmine.objectContaining({
          id: 'explore_definition3', visible: true,
        }));
      });

      it('should show all nested menus', () => {
        sectionsService.findVisibleSections.and.returnValue(
          createSuccessfulRemoteDataObject$(createPaginatedList(ALL_NESTED_MENUS))
        );
        resolver.createPublicMenu$().subscribe();
        expect(menuService.addSection).toHaveBeenCalledWith(
          MenuID.PUBLIC,
          jasmine.objectContaining({
            id: 'explore_nested_definition1',
            parentID: 'explore_definition1',
            active: false,
            visible: true
          })
        );
        expect(menuService.addSection).toHaveBeenCalledWith(
          MenuID.PUBLIC,
          jasmine.objectContaining({
            id: 'explore_nested_definition2',
            parentID: 'explore_definition2',
            active: false,
            visible: true
          })
        );
        expect(menuService.addSection).toHaveBeenCalledWith(
          MenuID.PUBLIC,
          jasmine.objectContaining({
            id: 'explore_nested_definition3',
            parentID: 'explore_definition3',
            active: false,
            visible: true
          })
        );
      });

      it('should show no menus', () => {
        sectionsService.findVisibleSections.and.returnValue(
          createSuccessfulRemoteDataObject$(createPaginatedList(NO_MENUS))
        );
        resolver.createPublicMenu$().subscribe();
        expect(menuService.addSection).toHaveBeenCalledWith(
          MenuID.PUBLIC,
          jasmine.objectContaining({})
        );
      });
    });
  });

  describe('createAdminMenu$', () => {
    const dontShowAdminSections = () => {
      it('should not show site admin section', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'admin_search', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'registries', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          parentID: 'registries', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'curation_tasks', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'workflow', visible: false,
        }));
      });

      it('should not show access control section', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'access_control', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          parentID: 'access_control', visible: false,
        }));
      });

      // We check that the menu section has not been called with visible set to true
      // The reason why we don't check if it has been called with visible set to false
      // Is because the function does not get called unless a user is authorised
      it('should not show the import section', () => {
        expect(menuService.addSection).not.toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'import', visible: true,
        }));
      });

      // We check that the menu section has not been called with visible set to true
      // The reason why we don't check if it has been called with visible set to false
      // Is because the function does not get called unless a user is authorised
      it('should not show the export section', () => {
        expect(menuService.addSection).not.toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'export', visible: true,
        }));
      });
    };

    const dontShowNewSection = () => {
      it('should not show the "New" section', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'new_community', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'new_collection', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'new_item', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'new', visible: false,
        }));
      });
    };

    const dontShowEditSection = () => {
      it('should not show the "Edit" section', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'edit_community', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'edit_collection', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'edit_item', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'edit', visible: false,
        }));
      });
    };

    it('should retrieve the menu by ID return an Observable that emits true as soon as it is created', () => {
      (menuService as any).getMenu.and.returnValue(cold('--u--m', {
        u: undefined,
        m: MENU_STATE,
      }));

      expect(resolver.createAdminMenu$()).toBeObservable(cold('-----(t|)', BOOLEAN));
      expect(menuService.getMenu).toHaveBeenCalledOnceWith(MenuID.ADMIN);
    });

    describe('for regular user', () => {
      beforeEach(() => {
        authorizationService.isAuthorized = createSpy('isAuthorized').and.callFake((featureID) => {
          return observableOf(false);
        });
      });

      beforeEach((done) => {
        resolver.createAdminMenu$().subscribe((_) => {
          done();
        });
      });

      dontShowAdminSections();
      dontShowNewSection();
      dontShowEditSection();
    });

    describe('regular user who can submit', () => {
      beforeEach(() => {
        authorizationService.isAuthorized = createSpy('isAuthorized')
          .and.callFake((featureID: FeatureID) => {
            return observableOf(featureID === FeatureID.CanSubmit);
          });
      });

      beforeEach((done) => {
        resolver.createAdminMenu$().subscribe((_) => {
          done();
        });
      });

      it('should not show "New Item" section', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'new_item', visible: false,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'new', visible: false,
        }));
      });

      dontShowAdminSections();
      dontShowEditSection();
    });

    describe('regular user who can edit items', () => {
      beforeEach(() => {
        authorizationService.isAuthorized = createSpy('isAuthorized')
          .and.callFake((featureID: FeatureID) => {
            return observableOf(featureID === FeatureID.CanEditItem);
          });
      });

      beforeEach((done) => {
        resolver.createAdminMenu$().subscribe((_) => {
          done();
        });
      });

      it('should show "Edit Item" section', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'edit_item', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'edit', visible: true,
        }));
      });

      dontShowAdminSections();
      dontShowNewSection();
    });

    describe('for site admin', () => {
      beforeEach(() => {
        authorizationService.isAuthorized = createSpy('isAuthorized').and.callFake((featureID: FeatureID) => {
          return observableOf(featureID === FeatureID.AdministratorOf);
        });
      });

      beforeEach((done) => {
        resolver.createAdminMenu$().subscribe((_) => {
          done();
        });
      });

      it('should show new_process', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'new_process', visible: true,
        }));
      });

      it('should contain site admin section', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'admin_search', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'registries', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          parentID: 'registries', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'curation_tasks', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'workflow', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'workflow', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'import', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'import_batch', parentID: 'import', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'export', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'export_batch', parentID: 'export', visible: true,
        }));
      });
    });

    describe('for community admin', () => {
      beforeEach(() => {
        authorizationService.isAuthorized = createSpy('isAuthorized').and.callFake((featureID: FeatureID) => {
          return observableOf(featureID === FeatureID.IsCommunityAdmin);
        });
      });

      beforeEach((done) => {
        resolver.createAdminMenu$().subscribe((_) => {
          done();
        });
      });

      it('should show edit_community', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'edit_community', visible: true,
        }));
      });
    });

    describe('for collection admin', () => {
      beforeEach(() => {
        authorizationService.isAuthorized = createSpy('isAuthorized').and.callFake((featureID: FeatureID) => {
          return observableOf(featureID === FeatureID.IsCollectionAdmin);
        });
      });

      beforeEach((done) => {
        resolver.createAdminMenu$().subscribe((_) => {
          done();
        });
      });

      it('should show edit_collection', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'edit_collection', visible: true,
        }));
      });
    });

    describe('for group admin', () => {
      beforeEach(() => {
        authorizationService.isAuthorized = createSpy('isAuthorized').and.callFake((featureID: FeatureID) => {
          return observableOf(featureID === FeatureID.CanManageGroups);
        });
      });

      beforeEach((done) => {
        resolver.createAdminMenu$().subscribe((_) => {
          done();
        });
      });

      it('should show access control section', () => {
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          id: 'access_control', visible: true,
        }));
        expect(menuService.addSection).toHaveBeenCalledWith(MenuID.ADMIN, jasmine.objectContaining({
          parentID: 'access_control', visible: true,
        }));
      });
    });
  });
});
