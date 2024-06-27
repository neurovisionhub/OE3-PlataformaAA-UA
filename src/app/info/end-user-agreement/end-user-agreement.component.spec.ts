import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { EndUserAgreementComponent } from './end-user-agreement.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { EndUserAgreementService } from '../../core/end-user-agreement/end-user-agreement.service';
import { NotificationsService } from '../../shared/notifications/notifications.service';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of as observableOf } from 'rxjs';
import { Store } from '@ngrx/store';
import { By } from '@angular/platform-browser';
import { LogOutAction, RefreshTokenAndRedirectAction } from '../../core/auth/auth.actions';
import { ActivatedRouteStub } from '../../shared/testing/active-router.stub';
import { AuthTokenInfo } from '../../core/auth/models/auth-token-info.model';

describe('EndUserAgreementComponent', () => {
  let component: EndUserAgreementComponent;
  let fixture: ComponentFixture<EndUserAgreementComponent>;

  let endUserAgreementService: EndUserAgreementService;
  let notificationsService: NotificationsService;
  let authService: AuthService;
  let store;
  let router: Router;
  let route: ActivatedRoute;

  let redirectUrl: string;

  let token: AuthTokenInfo;

  function init() {
    redirectUrl = 'redirect/url';
    token = new AuthTokenInfo('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');

    endUserAgreementService = jasmine.createSpyObj('endUserAgreementService', {
      hasCurrentUserOrCookieAcceptedAgreement: observableOf(false),
      setUserAcceptedAgreement: observableOf(true)
    });
    notificationsService = jasmine.createSpyObj('notificationsService', ['success', 'error', 'warning']);
    authService = jasmine.createSpyObj('authService', {
      isAuthenticated: observableOf(true),
      getToken: token
    });
    store = jasmine.createSpyObj('store', ['dispatch']);
    router = jasmine.createSpyObj('router', ['navigate', 'navigateByUrl']);
    route = Object.assign(new ActivatedRouteStub(), {
      queryParams: observableOf({
        redirect: redirectUrl
      })
    }) as any;
  }

  beforeEach(waitForAsync(() => {
    init();
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [EndUserAgreementComponent],
      providers: [
        { provide: EndUserAgreementService, useValue: endUserAgreementService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AuthService, useValue: authService },
        { provide: Store, useValue: store },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EndUserAgreementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('when the user hasn\'t accepted the agreement', () => {
    beforeEach(() => {
      (endUserAgreementService.hasCurrentUserOrCookieAcceptedAgreement as jasmine.Spy).and.returnValue(observableOf(false));
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should initialize the accepted property', () => {
      expect(component.accepted).toEqual(false);
    });

    it('should disable the save button', () => {
      const button = fixture.debugElement.query(By.css('#button-save')).nativeElement;
      expect(button.disabled).toBeTruthy();
    });

    describe('when user checks the chcexbox ', () => {

      beforeEach(() => {
        component.accepted = true;
        fixture.detectChanges();
      });

      it('button should be enabled', () => {
        const button = fixture.debugElement.query(By.css('#button-save')).nativeElement;
        expect(button.disabled).toBeFalse();
      });

      describe('submit', () => {
        describe('when accepting the agreement was successful', () => {
          beforeEach(() => {
            (endUserAgreementService.setUserAcceptedAgreement as jasmine.Spy).and.returnValue(observableOf(true));
            component.submit();
          });

          it('should display a success notification', () => {
            expect(notificationsService.success).toHaveBeenCalled();
          });

          it('should refresh the token and navigate the user to the redirect url', () => {
            expect(store.dispatch).toHaveBeenCalledWith(new RefreshTokenAndRedirectAction(token, redirectUrl));
          });
        });

        describe('when accepting the agreement was unsuccessful', () => {
          beforeEach(() => {
            (endUserAgreementService.setUserAcceptedAgreement as jasmine.Spy).and.returnValue(observableOf(false));
            component.submit();
          });

          it('should display an error notification', () => {
            expect(notificationsService.error).toHaveBeenCalled();
          });
        });
      });

    });

  });

  describe('when the user has already accepted the agreement', () => {

    beforeEach(() => {
      (endUserAgreementService.hasCurrentUserOrCookieAcceptedAgreement as jasmine.Spy).and.returnValue(observableOf(true));
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should initialize the accepted property', () => {
      expect(component.accepted).toEqual(true);
    });

    it('should initialize the alreadyAccepted property', () => {
      expect(component.alreadyAccepted).toEqual(true);
    });

    it('should not show form', () => {
      const form = fixture.debugElement.query(By.css('.form-user-agreement-accept'));
      expect(form).toBeNull();
    });

  });

  describe('cancel', () => {
    describe('when the user is authenticated', () => {
      beforeEach(() => {
        (authService.isAuthenticated as jasmine.Spy).and.returnValue(observableOf(true));
        component.cancel();
      });

      it('should logout the user', () => {
        expect(store.dispatch).toHaveBeenCalledWith(new LogOutAction());
      });
    });

    describe('when the user is not authenticated', () => {
      beforeEach(() => {
        (authService.isAuthenticated as jasmine.Spy).and.returnValue(observableOf(false));
        component.cancel();
      });

      it('should navigate the user to the homepage', () => {
        expect(router.navigate).toHaveBeenCalledWith(['home']);
      });
    });
  });
});
