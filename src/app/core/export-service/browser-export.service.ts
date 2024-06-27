import { ExportAsConfig, ExportAsService } from 'ngx-export-as';
import { toJpeg, toPng } from 'html-to-image';
import { Options } from 'html-to-image/es/types';
import { saveAs } from 'file-saver';
import { BehaviorSubject } from 'rxjs';

import { ExportImageType, ExportService } from './export.service';

/**
 *  IMPORTANT
 *  Due to a problem occurring on SSR with the ExportAsService dependency, which use window object, this service can't be injected.
 *  So we need to instantiate the class directly based on current the platform whn is needed
 *  TODO To be refactored when https://github.com/wnabil/ngx-export-as/pull/112 is fixed
 */
export class BrowserExportService implements ExportService {

  /**
   * Configuration for CSV export process
   */
  exportAsConfig: ExportAsConfig;

  /**
   * Creates excel from the table element reference.
   *
   * @param type of export.
   * @param fileName is the file name to save as.
   * @param elementIdOrContent is the content that is being exported.
   * @param download option if it's going to be downloaded.
   */
  exportAsFile(type: any, elementIdOrContent: string, fileName: string, download: boolean = true) {

    this.exportAsConfig = {
      type:type,
      elementIdOrContent: elementIdOrContent,
      fileName:fileName,
      download:download
    };

    const exportAsService: ExportAsService = new ExportAsService();
    return exportAsService.save(this.exportAsConfig, fileName);
  }

  /**
   * Creates an image from the given element reference.
   *
   * @param domNode   The HTMLElement.
   * @param type      The type of image to export.
   * @param fileName  The file name to save as.
   * @param isLoading A boolean representing the exporting process status.
   */
  exportAsImage(domNode: HTMLElement, type: ExportImageType, fileName: string, isLoading: BehaviorSubject<boolean>): void {

    const options: Options = { backgroundColor: '#ffffff' };

    if (type === ExportImageType.png) {
      toPng(domNode, options)
      .then((dataUrl) => {
        saveAs(dataUrl, fileName + '.' + type);
        isLoading.next(false);
      });
    } else {
      toJpeg(domNode, options)
      .then((dataUrl) => {
        saveAs(dataUrl, fileName + '.' + type);
        isLoading.next(false);
      });
    }

  }

}
