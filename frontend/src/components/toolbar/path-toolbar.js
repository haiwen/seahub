import React from 'react';
import { gettext, repoID, permission, siteRoot, initialFilePath } from '../constants';

function PathToolBar() {

  let trashUrl = '';
  let historyUrl = '';
  if (initialFilePath === '/' && permission) {
    trashUrl = siteRoot + 'repo/recycle/' + repoID + '/?referer=' + encodeURIComponent(location.href);
    historyUrl = siteRoot + 'repo/history/' + repoID + '/?referer=' + encodeURIComponent(location.href);
    return (
      <ul className="path-toolbar-container">
        <li className="tool-item"><a className="op-link sf2-icon-trash" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
        <li className="tool-item"><a className="op-link sf2-icon-history" href={historyUrl} title={gettext('History')} aria-label={gettext('History')}></a></li>
      </ul>
    );
  } else if (permission) {
    trashUrl = siteRoot + 'dir/recycle/' + repoID + '/?dir_path=' + encodeURIComponent(initialFilePath);
    return (
      <ul className="path-toolbar-container">
        <li className="tool-item"><a className="op-link sf2-icon-trash" href={trashUrl} title={gettext('Trash')} aria-label={gettext('Trash')}></a></li>
      </ul>
    );
  }
  return '';

}

export default PathToolBar;
