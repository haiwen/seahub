import {siteRoot, historyRepoID, fileServerRoot } from '../components/constants';
import { encodePath } from '../components/utils';
class URLDecorator {

  static getUrl(options) {
    let url = '';
    let params = '';
    switch (options.type) {
    case 'download_historic_file':
      params = 'p=' + options.filePath;
      url = siteRoot + 'repo/' + historyRepoID + '/' + options.objID + '/download?' + params;
      break;
    case 'download_dir_zip_url':
      url = fileServerRoot + 'zip/' + options.token;
      break;
    case 'download_file_url':
      url = siteRoot + 'lib/' + options.repoID + '/file' + encodePath(options.filePath) + '?dl=1';
      break;
    default:
      url = '';
      break;
    }
    return url;
  }

}

export default URLDecorator;