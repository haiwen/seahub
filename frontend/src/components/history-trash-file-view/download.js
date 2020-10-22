import React from 'react';
import { gettext, siteRoot } from '../../utils/constants';

const {
  fileName, repoID, objID, path
} = window.app.pageOptions;

function Download() {
  return (
    <a href={`${siteRoot}repo/${repoID}/${objID}/download/?file_name=${encodeURIComponent(fileName)}&p=${encodeURIComponent(path)}`} className="btn btn-secondary">{gettext('Download')}</a>
  );
}

export default Download;
