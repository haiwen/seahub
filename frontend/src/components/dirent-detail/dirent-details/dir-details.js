import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import DetailItem from '../detail-item';
import Formatter from '../../../metadata/components/formatter';
import { CellType } from '../../../metadata/constants';
import { gettext } from '../../../utils/constants';
import { MetadataDetails } from '../../../metadata';
import { useMetadataStatus } from '../../../hooks';

const DirDetails = ({ direntDetail }) => {
  const { enableMetadata, enableMetadataManagement } = useMetadataStatus();
  const lastModifiedTimeField = useMemo(() => {
    return { type: CellType.MTIME, name: gettext('Last modified time') };
  }, []);

  return (
    <>
      <DetailItem field={lastModifiedTimeField} className="sf-metadata-property-detail-formatter">
        <Formatter field={lastModifiedTimeField} value={direntDetail.mtime} />
      </DetailItem>
      {enableMetadataManagement && enableMetadata && (
        <MetadataDetails />
      )}
    </>
  );
};

DirDetails.propTypes = {
  direntDetail: PropTypes.object,
};

export default DirDetails;
