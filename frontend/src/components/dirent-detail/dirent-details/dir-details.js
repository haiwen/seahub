import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { getDirentPath } from './utils';
import DetailItem from '../detail-item';
import { CellType } from '../../../metadata/metadata-view/_basic';
import { gettext } from '../../../utils/constants';
import { MetadataDetails, useMetadata } from '../../../metadata';

const DirDetails = ({ repoID, repoInfo, dirent, path, direntDetail, ...params }) => {
  const direntPath = useMemo(() => getDirentPath(dirent, path), [dirent, path]);
  const { enableMetadata } = useMetadata();

  return (
    <>
      <DetailItem field={{ type: CellType.MTIME, name: gettext('Last modified time') }} value={direntDetail.mtime} />
      {window.app.pageOptions.enableMetadataManagement && enableMetadata && (
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
