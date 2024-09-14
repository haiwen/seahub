import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import { getDirentPath } from './utils';
import DetailItem from '../detail-item';
import { CellType } from '../../../metadata/constants';
import { gettext } from '../../../utils/constants';
import { MetadataDetails, useMetadata } from '../../../metadata';

const DirDetails = ({ repoID, repoInfo, dirent, path, direntDetail }) => {
  const direntPath = useMemo(() => getDirentPath(dirent, path), [dirent, path]);
  const { enableMetadata } = useMetadata();
  const lastModifiedTimeField = useMemo(() => {
    return { type: CellType.MTIME, name: gettext('Last modified time') };
  }, []);

  return (
    <>
      <DetailItem field={lastModifiedTimeField} className="sf-metadata-property-detail-formatter">
        <Formatter field={lastModifiedTimeField} value={direntDetail.mtime} />
      </DetailItem>
      {window.app.pageOptions.enableMetadataManagement && enableMetadata && (
        <MetadataDetails repoID={repoID} repoInfo={repoInfo} filePath={direntPath} direntType="dir" />
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
