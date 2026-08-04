import React, { useState } from 'react';
import { siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';

import '../../css/epub-file-view.css';

const {
  repoID, filePath, fileName, lastModificationTime, thumbnailSizeForOriginal,
} = window.app.pageOptions;

const EPUB = ({ tip }) => {
  const [loadFailed, setLoadFailed] = useState(false);

  if (loadFailed) {
    return tip;
  }

  const coverURL = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${Utils.encodePath(filePath)}?mtime=${lastModificationTime}`;
  return (
    <div className="file-view-content epub-file-view flex-1">
      <img src={coverURL} alt={fileName} onError={() => setLoadFailed(true)} />
    </div>
  );
};

export default EPUB;
