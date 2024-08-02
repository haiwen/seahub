import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { getDirentPath, getDirentPosition } from './utils';
import DetailItem from '../detail-item';
import { CellType } from '../../../metadata/metadata-view/_basic';
import { gettext } from '../../../utils/constants';
import EditMetadata from './edit-metadata';

const DirDetails = ({ repoID, repoInfo, dirent, direntType, path, direntDetail }) => {
  const position = useMemo(() => getDirentPosition(repoInfo, dirent, path), [repoInfo, dirent, path]);
  const direntPath = useMemo(() => getDirentPath(dirent, path), [dirent, path]);

  return (
    <>
      <DetailItem field={{ type: CellType.TEXT, name: gettext('File location') }} value={position} />
      <DetailItem field={{ type: 'size', name: gettext('Size') }} value={repoInfo.size} />
      <DetailItem field={{ type: CellType.CREATOR, name: gettext('Creator') }} value={repoInfo.owner_email} collaborators={[{
        name: repoInfo.owner_name,
        contact_email: repoInfo.owner_contact_email,
        email: repoInfo.owner_email,
        avatar_url: repoInfo.owner_avatar,
      }]} />
      <DetailItem field={{ type: CellType.MTIME, name: gettext('Last modified time') }} value={direntDetail.mtime} />
      {direntDetail.permission === 'rw' && window.app.pageOptions.enableMetadataManagement && (
        <EditMetadata repoID={repoID} direntPath={direntPath} direntType={direntType} direntDetail={direntDetail} />
      )}
    </>
  );
};

DirDetails.propTypes = {
  repoID: PropTypes.string,
  repoInfo: PropTypes.object,
  dirent: PropTypes.object,
  direntType: PropTypes.string,
  path: PropTypes.string,
  direntDetail: PropTypes.object,
};

export default DirDetails;
