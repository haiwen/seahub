import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { getDirentPath, getFileParent } from './utils';
import DetailItem from '../detail-item';
import { CellType } from '../../../metadata/metadata-view/_basic';
import { gettext } from '../../../utils/constants';
import { MetadataDetails } from '../../../metadata';

const DirDetails = ({ repoID, repoInfo, dirent, path, direntDetail, ...params }) => {
  const parent = useMemo(() => getFileParent(repoInfo, dirent, path), [repoInfo, dirent, path]);
  const direntPath = useMemo(() => getDirentPath(dirent, path), [dirent, path]);

  return (
    <>
      <DetailItem field={{ type: CellType.TEXT, name: gettext('Parent') }} value={parent} />
      <DetailItem field={{ type: 'size', name: gettext('Size') }} value={repoInfo.size} />
      <DetailItem field={{ type: CellType.CREATOR, name: gettext('Creator') }} value={repoInfo.owner_email} collaborators={[{
        name: repoInfo.owner_name,
        contact_email: repoInfo.owner_contact_email,
        email: repoInfo.owner_email,
        avatar_url: repoInfo.owner_avatar,
      }]} />
      <DetailItem field={{ type: CellType.MTIME, name: gettext('Last modified time') }} value={direntDetail.mtime} />
      {window.app.pageOptions.enableMetadataManagement && (
        <MetadataDetails repoID={repoID} filePath={direntPath} direntType="dir" { ...params } />
      )}
    </>
  );
};

DirDetails.propTypes = {
  repoID: PropTypes.string,
  repoInfo: PropTypes.object,
  dirent: PropTypes.object,
  path: PropTypes.string,
  direntDetail: PropTypes.object,
};

export default DirDetails;
