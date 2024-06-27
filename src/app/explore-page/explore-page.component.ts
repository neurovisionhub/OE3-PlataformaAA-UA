import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SectionComponent } from '../core/layout/models/section.model';
import { SectionDataService } from '../core/layout/section-data.service';
import { getFirstSucceededRemoteDataPayload } from '../core/shared/operators';

/**
 * Component representing the explore section.
 */
@Component({
    selector: 'ds-explore',
    templateUrl: './explore-page.component.html'
})
export class ExplorePageComponent implements OnInit {

    /**
     * The id of the current section.
     */
    sectionId: string;

    /**
     * Resolved section components splitted in rows.
     */
    sectionComponentRows: Observable<SectionComponent[][]>;

    constructor(
        private route: ActivatedRoute,
        private sectionDataService: SectionDataService ) {}

    ngOnInit() {
        this.route.params.subscribe((params) => this.setupSectionComponents(params));
    }

    /**
     * Setup the section components of the explore page based on the section id.
     *
     * @param params the route params
     */
    setupSectionComponents( params: Params ) {
        this.sectionId = params.id;
        this.sectionComponentRows = this.sectionDataService.findById(params.id ).pipe(
            getFirstSucceededRemoteDataPayload(),
            map ( (section) => section.componentRows)
        );
    }

  /**
   * Check if style contains 'col' or 'col-x'
   * @param style the style of the cell (a list of classes separated by space)
   */
  hasColClass(style) {
    return style?.split(' ').filter((c) => (c === 'col' || c.startsWith('col-'))).length > 0;
  }

}
