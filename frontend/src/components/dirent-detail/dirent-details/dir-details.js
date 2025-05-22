import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import DetailItem from '../detail-item';
import Formatter from '../../../metadata/components/formatter';
import { CellType } from '../../../metadata/constants';
import { gettext } from '../../../utils/constants';
import { MetadataDetails } from '../../../metadata';
import { useMetadataStatus } from '../../../hooks';
import { Utils } from '../../../utils/utils';
import { SYSTEM_FOLDERS } from '../../../constants';

const DirDetails = ({ direntDetail, tagsData, addTag }) => {
  const { enableMetadata, enableMetadataManagement } = useMetadataStatus();

  const lastModifiedTimeField = useMemo(() => {
    return { type: CellType.MTIME, name: gettext('Last modified time') };
  }, []);

  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const filesField = useMemo(() => ({ type: CellType.NUMBER, name: gettext('Files') }), []);
  let file_count = direntDetail.file_count || 0;
  let size = Utils.bytesToSize(direntDetail.size);
  let special_folder = false;
  if (direntDetail.path !== undefined) {
    const path = direntDetail.path;
    special_folder = SYSTEM_FOLDERS.some(prefix => path === prefix || path.startsWith(prefix + '/'));
  }

  return (
    <>
      {enableMetadataManagement && enableMetadata && (
        <>
          <DetailItem field={filesField} value={file_count} className="sf-metadata-property-detail-formatter">
            {special_folder ?
              <Formatter field={CellType.TEXT} value={'--'} /> :
              <Formatter field={filesField} value={file_count} />}
          </DetailItem>
          <DetailItem field={sizeField} value={size} className="sf-metadata-property-detail-formatter">
            {special_folder ?
              <Formatter field={CellType.TEXT} value={'--'} /> :
              <Formatter field={sizeField} value={size} />}
          </DetailItem>
          <MetadataDetails tagsData={tagsData} addTag={addTag} />
        </>
      )}
      <DetailItem field={lastModifiedTimeField} className="sf-metadata-property-detail-formatter">
        <Formatter field={lastModifiedTimeField} value={direntDetail.mtime} />
      </DetailItem>
    </>
  );
};

DirDetails.propTypes = {
  direntDetail: PropTypes.object,
  tagsData: PropTypes.object,
  addTag: PropTypes.func,
};

export default DirDetails;
