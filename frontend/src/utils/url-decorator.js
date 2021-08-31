import { siteRoot, historyRepoID } from './constants';
import { Utils } from './utils';
class URLDecorator {

  static getUrl(options) {
    let url = '';
    let params = '';
    switch (options.type) {
      case 'download_historic_file':
        params = 'p=' + Utils.encodePath(options.filePath);
        url = siteRoot + 'repo/' + historyRepoID + '/' + options.objID + '/download?' + params;
        break;
      case 'download_file_url':
        url = siteRoot + 'lib/' + options.repoID + '/file' + Utils.encodePath(options.filePath) + '?dl=1';
        break;
      case 'file_revisions':
        params = 'p=' + Utils.encodePath(options.filePath);
        url = siteRoot + 'repo/file_revisions/' + options.repoID + '/?' + params;
        break;
      case 'open_via_client':
        url = 'seafile://openfile?repo_id=' + options.repoID + '&path=' + Utils.encodePath(options.filePath);
        break;
      case 'draft_view':
        url = siteRoot + 'lib/' + options.repoID + '/file' + options.filePath + '?mode=edit&draft_id=' + options.draftId;
        break;
      default:
        url = '';
        break;
    }
    return url;
  }

}

export default URLDecorator;
