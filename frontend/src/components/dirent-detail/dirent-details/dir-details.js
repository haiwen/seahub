import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import DetailItem from '../detail-item';
import Formatter from '../../../metadata/components/formatter';
import { CellType } from '../../../metadata/constants';
import { gettext } from '../../../utils/constants';
import { MetadataDetails } from '../../../metadata';
import { useMetadataStatus } from '../../../hooks';
import { Utils } from '../../../utils/utils';

const DirDetails = ({ direntDetail }) => {
  const { enableMetadata, enableMetadataManagement } = useMetadataStatus();
  const lastModifiedTimeField = useMemo(() => {
    return { type: CellType.MTIME, name: gettext('Last modified time') };
  }, []);
  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const filesField = useMemo(() => ({ type: CellType.NUMBER, name: gettext('Files') }), []);
  return (
    <>
      {enableMetadataManagement && enableMetadata && (
        <>
          <DetailItem field={filesField} value={direntDetail.file_count || 0} className="sf-metadata-property-detail-formatter">
            <Formatter field={filesField} value={direntDetail.file_count || 0} />
          </DetailItem>
          <DetailItem field={sizeField} value={Utils.bytesToSize(direntDetail.size)} className="sf-metadata-property-detail-formatter">
            <Formatter field={sizeField} value={Utils.bytesToSize(direntDetail.size)} />
          </DetailItem>
          <MetadataDetails />
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
};

export default DirDetails;
