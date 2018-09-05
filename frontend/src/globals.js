export const gettext = window.gettext;
export const siteRoot = window.app.config.siteRoot;
export const lang = window.app.config.lang;

export const getUrl = (options) => {
  switch (options.name) {
    case 'user_profile': return siteRoot + 'profile/' + options.username + '/';
    case 'common_lib': return siteRoot + '#common/lib/' + options.repoID + options.path;
    case 'view_lib_file': return `${siteRoot}lib/${options.repoID}/file${options.filePath}`;
    case 'download_historic_file': return `${siteRoot}repo/${options.repoID}/${options.objID}/download/?p=${options.filePath}`;
    case 'view_historic_file': return `${siteRoot}repo/${options.repoID}/history/files/?obj_id=${options.objID}&commit_id=${options.commitID}&p=${options.filePath}`;
    case 'diff_historic_file': return `${siteRoot}repo/text_diff/${options.repoID}/?commit=${options.commitID}&p=${options.filePath}`;

  }
}
