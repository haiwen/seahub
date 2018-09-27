import {siteRoot, historyRepoID, fileServerRoot } from '../components/constants';
import { encodePath } from '../components/utils';
class URLDecorator {

  static getUrl(options) {
    let url = '';
    let params = '';
    switch (options.type) {
    case 'user_profile': 
      url = siteRoot + 'profile/' + options.username + '/';
      break;
    case 'common_lib':
      url = siteRoot + '#common/lib/' + historyRepoID + options.path;
      break;
    case 'view_lib_file':
      url = siteRoot + 'lib/' + historyRepoID + '/file' + options.filePath;
      break;
    case 'download_historic_file':
      params = 'p=' + options.filePath;
      url = siteRoot + 'repo/' + historyRepoID + '/' + options.objID + '/download?' + params;
      break;
    case 'view_historic_file':
      params = 'obj_id=' + options.objID + '&commit_id=' + options.commitID + '&p=' + options.filePath;
      url = siteRoot + 'repo/' + options.repoID + 'history/files/?' + params;
      break;
    case 'diff_historic_file':
      params = 'commit_id=' + options.commitID + '&p=' + options.filePath;
      url = siteRoot + 'repo/text_diff/' + historyRepoID + '/?' + params;
      break;
    case 'download_dir_zip_url':
      url = fileServerRoot + 'zip/' + options.token;
      break;
    case 'download_file_url':
      url = siteRoot + 'lib/' + options.repoID + "/file" + encodePath(options.filePath) + "?dl=1";
      break;
    default:
      url = '';
      break;
    }
    return url;
  }

}

export default URLDecorator;