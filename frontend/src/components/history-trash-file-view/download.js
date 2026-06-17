import React from 'react';
import { gettext, siteRoot } from '../../utils/constants';

const {
  fileName, repoID, objID, path, isSysAdminView
} = window.app.pageOptions;

function Download() {
  const url = isSysAdminView ?
    `${siteRoot}sys/libraries/${repoID}/history/snapshot/download/${objID}/?file_name=${encodeURIComponent(fileName)}&p=${encodeURIComponent(path)}` :
    `${siteRoot}repo/${repoID}/${objID}/download/?file_name=${encodeURIComponent(fileName)}&p=${encodeURIComponent(path)}`;

  return (
    <a href={url} className="btn btn-secondary flex-shrink-0">{gettext('Download')}</a>
  );
}

export default Download;
