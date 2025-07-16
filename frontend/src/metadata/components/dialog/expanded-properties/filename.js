import React from 'react';
import { getFileMTimeFromRecord, getFileNameFromRecord, getParentDirFromRecord } from '../../../utils/cell';
import { checkIsDir } from '../../../utils/row';
import { Utils } from '../../../../utils/utils';
import { siteRoot, thumbnailDefaultSize } from '../../../../utils/constants';

const FileName = ({ record }) => {
  const parentDir = getParentDirFromRecord(record);
  const filename = getFileNameFromRecord(record);
  const isDir = checkIsDir(record);
  let iconUrl = Utils.getFileIconUrl(filename);
  if (isDir) {
    iconUrl = Utils.getFolderIconUrl();
  } else if (Utils.imageCheck(filename)) {
    const path = Utils.encodePath(Utils.joinPath(parentDir, filename));
    const repoID = window.sfMetadataStore.repoId;
    iconUrl = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}?mtime=${getFileMTimeFromRecord(record)}`;
  }

  return (
    <div className="form-control disabled">
      <span className="w-6 h-6 overflow-hidden mr-2">
        <img src={iconUrl} height={24} alt='' />
      </span>
      <span>{filename}</span>
    </div>
  );
};

export default FileName;
