import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PaginatedList } from '../data/paginated-list.model';
import { RemoteData } from '../data/remote-data';
import { Item } from '../shared/item.model';
import { getFirstSucceededRemoteData } from '../shared/operators';
import { BrowseEntrySearchOptions } from './browse-entry-search-options.model';
import { FollowLinkConfig } from '../../shared/utils/follow-link-config.model';
import { ItemDataService } from '../data/item-data.service';
import { BrowseService } from './browse.service';
import { environment } from '../../../environments/environment';
import { DSpaceObject } from '../shared/dspace-object.model';
import { PaginatedSearchOptions } from '../../shared/search/models/paginated-search-options.model';
import { SearchObjects } from '../../shared/search/models/search-objects.model';
import { SearchService } from '../shared/search/search.service';
import { WorkspaceItem } from '../submission/models/workspaceitem.model';
import { WorkflowItem } from '../submission/models/workflowitem.model';
import { hasValue } from '../../shared/empty.util';
import { FollowAuthorityMetadata } from '../../../config/search-follow-metadata.interface';
import { MetadataValue } from '../shared/metadata.models';
import { Metadata } from '../shared/metadata.utils';
import isArray from 'lodash/isArray';

/**
 * The service aims to manage browse requests and subsequent extra fetch requests.
 */
@Injectable({providedIn: 'root'})
export class SearchManager {

  constructor(
    protected itemService: ItemDataService,
    protected browseService: BrowseService,
    protected searchService: SearchService,
  ) {
  }

  /**
   * Get all items linked to a certain metadata value
   * @param filterValue       metadata value to filter by (e.g. author's name)
   * @param filterAuthority   metadata authority to filter
   * @param options           Options to narrow down your search
   * @param linksToFollow     The array of [[FollowLinkConfig]]
   * @returns {Observable<RemoteData<PaginatedList<Item>>>}
   */
  getBrowseItemsFor(filterValue: string, filterAuthority: string, options: BrowseEntrySearchOptions, ...linksToFollow: FollowLinkConfig<any>[]): Observable<RemoteData<PaginatedList<Item>>> {
    return this.browseService.getBrowseItemsFor(filterValue, filterAuthority, options, ...linksToFollow)
      .pipe(this.completeWithExtraData());
  }

  /**
   * Method to retrieve a paginated list of search results from the server
   * @param {PaginatedSearchOptions} searchOptions The configuration necessary to perform this search
   * @param responseMsToLive The amount of milliseconds for the response to live in cache
   * @param useCachedVersionIfAvailable If this is true, the request will only be sent if there's
   * no valid cached version. Defaults to true
   * @param reRequestOnStale Whether or not the request should automatically be re-requested after
   * the response becomes stale
   * @param linksToFollow List of {@link FollowLinkConfig} that indicate which {@link HALLink}s should be automatically resolved
   * @returns {Observable<RemoteData<SearchObjects<T>>>} Emits a paginated list with all search results found
   */
  search<T extends DSpaceObject>(
    searchOptions?: PaginatedSearchOptions,
    responseMsToLive?: number,
    useCachedVersionIfAvailable = true,
    reRequestOnStale = true,
    ...linksToFollow: FollowLinkConfig<T>[]): Observable<RemoteData<SearchObjects<T>>> {
    return this.searchService.search(searchOptions, responseMsToLive, useCachedVersionIfAvailable, reRequestOnStale, ...linksToFollow)
      .pipe(this.completeSearchObjectsWithExtraData());
  }


  protected completeWithExtraData() {
    return switchMap((itemsRD: RemoteData<PaginatedList<Item>>) => {
      if (itemsRD.isSuccess) {
        return this.fetchExtraData(itemsRD.payload.page).pipe(map(() => {
          return itemsRD;
        }));
      }
      return of(itemsRD);
    });
  }

  protected completeSearchObjectsWithExtraData<T extends DSpaceObject>() {
    return switchMap((searchObjectsRD: RemoteData<SearchObjects<T>>) => {
      if (searchObjectsRD.isSuccess) {
        const items: Item[] = searchObjectsRD.payload.page.map((searchResult) => searchResult.indexableObject) as any;
        return this.fetchExtraData(items).pipe(map(() => {
          return searchObjectsRD;
        }));
      }
      return of(searchObjectsRD);
    });
  }

  protected fetchExtraData<T extends DSpaceObject>(objects: T[]): Observable<any> {

    const items: Item[] = objects
      .map((object) => {
        if (object instanceof WorkspaceItem || object instanceof WorkflowItem) {
          return object.item as Item;
        }
        if (object instanceof Item) {
          return object as Item;
        }
      })
      .filter((item) => hasValue(item));

    const uuidList = this.extractUUID(items, environment.followAuthorityMetadata);

    return uuidList.length > 0 ? this.itemService.findAllById(uuidList).pipe(getFirstSucceededRemoteData()) : of(null);
  }

  protected extractUUID(items: Item[], metadataToFollow: FollowAuthorityMetadata[]): string[] {
    const uuidMap = {};

    items.forEach((item) => {
      metadataToFollow.forEach((followMetadata: FollowAuthorityMetadata) => {
        if (item.entityType === followMetadata.type) {
          if (isArray(followMetadata.metadata)) {
            followMetadata.metadata.forEach((metadata) => {
              item.allMetadata(metadata)
                .filter((metadataValue: MetadataValue) => Metadata.hasValidItemAuthority(metadataValue.authority))
                .forEach((metadataValue: MetadataValue) => uuidMap[metadataValue.authority] = metadataValue);
            });
          } else {
            item.allMetadata(followMetadata.metadata)
              .filter((metadataValue: MetadataValue) => Metadata.hasValidItemAuthority(metadataValue.authority))
              .forEach((metadataValue: MetadataValue) => uuidMap[metadataValue.authority] = metadataValue);
          }
        }
      });
    });

    return Object.keys(uuidMap);
  }
}
