import { siteRoot, historyRepoID, fileServerRoot } from './constants';
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
        url = fileServerRoot + 'repos/' + options.repoID + '/files/' + Utils.encodePath(options.filePath) + '/?op=download';
        break;
      case 'file_revisions':
        params = 'p=' + Utils.encodePath(options.filePath);
        url = siteRoot + 'repo/file_revisions/' + options.repoID + '/?' + params;
        break;
      case 'open_with_default':
        url = siteRoot + 'lib/' + options.repoID + '/file' + Utils.encodePath(options.filePath);
        break;
      case 'open_via_client':
        url = 'seafile://openfile?repo_id=' + options.repoID + '&path=' + Utils.encodePath(options.filePath);
        break;
      case 'open_with_onlyoffice':
        params = 'open_with_onlyoffice=true';
        url = siteRoot + 'lib/' + options.repoID + '/file' + Utils.encodePath(options.filePath) + '?' + params;
        break;
      default:
        url = '';
        break;
    }
    return url;
  }

}

export default URLDecorator;
