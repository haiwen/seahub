const siteRoot = window.app.config.siteRoot;
const repoID = window.fileHistory.pageOptions.repoID;

class URLDecorator {

  static getUrl(options) {
    let url = '';
    let params = '';
    switch (options.type) {
    case 'user_profile': 
      url = siteRoot + 'profile/' + options.username + '/';
      break;
    case 'common_lib':
      url = siteRoot + '#common/lib/' + repoID + options.path;
      break;
    case 'view_lib_file':
      url = siteRoot + 'lib/' + repoID + '/file' + options.filePath;
      break;
    case 'download_historic_file':
      params = 'p=' + options.filePath;
      url = siteRoot + 'repo/' + repoID + '/' + options.objID + '/download?' + params;
      break;
    case 'view_historic_file':
      params = 'obj_id=' + options.objID + '&commit_id=' + options.commitID + '&p=' + options.filePath;
      url = siteRoot + 'repo/' + options.repoID + 'history/files/?' + params;
      break;
    case 'diff_historic_file':
      params = 'commit_id=' + options.commitID + '&p=' + options.filePath;
      url = siteRoot + 'repo/text_diff/' + repoID + '/?' + params;
      break;
    default:
      url = '';
      break;
    }
    return url;
  }

}

export default URLDecorator;