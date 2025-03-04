import React, { useCallback, useMemo } from 'react';
import { PRIVATE_COLUMN_KEY } from '../../../metadata/constants';
import { gettext, mediaUrl, siteRoot, thumbnailDefaultSize } from '../../../utils/constants';
import { getCellValueByColumn, getFileMTimeFromRecord } from '../../../metadata/utils/cell';

import './index.css';

const People = ({ repoID, record }) => {
  const images = useMemo(() => {
    if (!record) return [];
    const faceLinks = getCellValueByColumn(record, { key: PRIVATE_COLUMN_KEY.FACE_LINKS });
    if (!faceLinks) return [];
    return faceLinks.map(item => ({
      ...item,
      url: `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}/_Internal/Faces/${item.row_id}.jpg?mtime=${getFileMTimeFromRecord(record)}`
    }));
  }, [repoID, record]);

  const onImgLoadError = useCallback((e) => {
    e.target.src = `${mediaUrl}avatars/default.png`;
  }, []);

  if (!images.length) return null;

  return (
    <div className="dirent-detail-people">
      {images.map(img => (
        <div className="dirent-detail-people-item" key={img.row_id} title={img.display_value || gettext('Unknown people')}>
          <img src={img.url} alt={img.display_value || gettext('Unknown people')} onError={onImgLoadError} height={32} width={32} />
        </div>
      ))}
    </div>
  );
};

export default People;
