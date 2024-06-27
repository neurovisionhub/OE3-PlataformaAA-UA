import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { combineLatest, Observable } from 'rxjs';
import { first, map, take } from 'rxjs/operators';

import { MyDSpaceConfigurationValueType } from './my-dspace-configuration-value-type';
import { RoleService } from '../core/roles/role.service';
import { SearchConfigurationOption } from '../shared/search/search-switch-configuration/search-configuration-option.model';
import { SearchConfigurationService } from '../core/shared/search/search-configuration.service';
import { PaginationComponentOptions } from '../shared/pagination/pagination-component-options.model';
import { SortDirection, SortOptions } from '../core/cache/models/sort-options.model';
import { RouteService } from '../core/services/route.service';
import { PaginationService } from '../core/pagination/pagination.service';
import { LinkService } from '../core/cache/builders/link.service';
import { HALEndpointService } from '../core/shared/hal-endpoint.service';
import { RequestService } from '../core/data/request.service';
import { RemoteDataBuildService } from '../core/cache/builders/remote-data-build.service';
import { Context } from '../core/shared/context.model';
import { UUIDService } from '../core/shared/uuid.service';

export const MyDSpaceConfigurationToContextMap = new Map([
  [MyDSpaceConfigurationValueType.Workspace, Context.Workspace],
  [MyDSpaceConfigurationValueType.SupervisedItems, Context.SupervisedItems],
  [MyDSpaceConfigurationValueType.OtherWorkspace, Context.OtherWorkspace],
  [MyDSpaceConfigurationValueType.Workflow, Context.Workflow]
]);


/**
 * Service that performs all actions that have to do with the current mydspace configuration
 */
@Injectable()
export class MyDSpaceConfigurationService extends SearchConfigurationService {
  /**
   * Default pagination settings
   */
  protected defaultPagination = Object.assign(new PaginationComponentOptions(), {
    id: this.uuidService.generate(),
    pageSize: 10,
    currentPage: 1
  });

  /**
   * Default sort settings
   */
  protected defaultSort = new SortOptions('lastModified', SortDirection.DESC);

  /**
   * Default configuration parameter setting
   */
  protected defaultConfiguration = 'workspace';

  /**
   * Default scope setting
   */
  protected defaultScope = '';

  /**
   * Default query setting
   */
  protected defaultQuery = '';

  private isAdmin$: Observable<boolean>;
  private isController$: Observable<boolean>;
  private isSubmitter$: Observable<boolean>;

  /**
   * Initialize class
   *
   * @param {roleService} roleService
   * @param {RouteService} routeService
   * @param {PaginationService} paginationService
   * @param {ActivatedRoute} route
   * @param linkService
   * @param halService
   * @param requestService
   * @param rdb
   */
  constructor(protected roleService: RoleService,
              protected routeService: RouteService,
              protected paginationService: PaginationService,
              protected route: ActivatedRoute,
              protected linkService: LinkService,
              protected halService: HALEndpointService,
              protected requestService: RequestService,
              protected rdb: RemoteDataBuildService,
              protected uuidService: UUIDService) {

    super(routeService, paginationService, route, linkService, halService, requestService, rdb);

    // override parent class initialization
    this._defaults = null;
    this.initDefaults();

    this.isSubmitter$ = this.roleService.isSubmitter();
    this.isController$ = this.roleService.isController();
    this.isAdmin$ = this.roleService.isAdmin();
  }

  /**
   * Returns the list of available configuration depend on the user role
   *
   * @return {Observable<MyDSpaceConfigurationValueType[]>}
   *    Emits the available configuration list
   */
  public getAvailableConfigurationTypes(): Observable<MyDSpaceConfigurationValueType[]> {
    return combineLatest([this.isSubmitter$, this.isController$, this.isAdmin$]).pipe(
      take(1),
       map(([isSubmitter, isController, isAdmin]: [boolean, boolean, boolean]) => {
        const availableConf: MyDSpaceConfigurationValueType[] = [];
        if (isSubmitter) {
          availableConf.push(MyDSpaceConfigurationValueType.Workspace);
          availableConf.push(MyDSpaceConfigurationValueType.OtherWorkspace);
        }
        if (isController || isAdmin) {
          availableConf.push(MyDSpaceConfigurationValueType.SupervisedItems);
          availableConf.push(MyDSpaceConfigurationValueType.Workflow);
        }
        return availableConf;
      }));
  }

  /**
   * Returns the select options for the available configuration list
   *
   * @return {Observable<SearchConfigurationOption[]>}
   *    Emits the select options list
   */
  public getAvailableConfigurationOptions(): Observable<SearchConfigurationOption[]> {
    return this.getAvailableConfigurationTypes().pipe(
      first(),
      map((availableConfigurationTypes: MyDSpaceConfigurationValueType[]) => {
        const configurationOptions: SearchConfigurationOption[] = [];
        availableConfigurationTypes.forEach((type) => {
          const value = type;
          const label = `mydspace.show.${value}`;
          const context = MyDSpaceConfigurationToContextMap.get(type);
          configurationOptions.push({ value, label, context });
        });
        return configurationOptions;
      })
    );
  }

}
