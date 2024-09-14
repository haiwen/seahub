import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import DetailItem from '../detail-item';
import { CellType } from '../../../metadata/constants';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { MetadataDetails, useEnableMetadata } from '../../../metadata';

const FileDetails = ({ repoID, repoInfo, path, direntDetail }) => {
  const { enableMetadata } = useEnableMetadata();

  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const lastModifierField = useMemo(() => ({ type: CellType.LAST_MODIFIER, name: gettext('Last modifier') }), []);
  const lastModifiedTimeField = useMemo(() => ({ type: CellType.MTIME, name: gettext('Last modified time') }), []);

  return (
    <>
      <DetailItem field={sizeField} className="sf-metadata-property-detail-formatter">
        <Formatter field={sizeField} value={Utils.bytesToSize(direntDetail.size)} />
      </DetailItem>
      <DetailItem field={lastModifierField} className="sf-metadata-property-detail-formatter">
        <Formatter
          field={lastModifierField}
          value={direntDetail.last_modifier_email}
          collaborators={[{
            name: direntDetail.last_modifier_name,
            contact_email: direntDetail.last_modifier_contact_email,
            email: direntDetail.last_modifier_email,
            avatar_url: direntDetail.last_modifier_avatar,
          }]}
        />
      </DetailItem >
      <DetailItem field={lastModifiedTimeField} className="sf-metadata-property-detail-formatter">
        <Formatter field={lastModifiedTimeField} value={direntDetail.last_modified}/>
      </DetailItem>
      {window.app.pageOptions.enableMetadataManagement && enableMetadata && (
        <MetadataDetails repoID={repoID} filePath={path} repoInfo={repoInfo} direntType="file" />
      )}
    </>
  );
};

FileDetails.propTypes = {
  repoID: PropTypes.string,
  repoInfo: PropTypes.object,
  path: PropTypes.string,
  direntDetail: PropTypes.object,
};

export default FileDetails;
