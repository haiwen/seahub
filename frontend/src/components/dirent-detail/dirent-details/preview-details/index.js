import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import DetailItem from '../../detail-item';
import { CellType } from '../../../../metadata/constants';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import { MetadataDetails } from '../../../../metadata';
import ObjectUtils from '../../../../metadata/utils/object-utils';
import Collapse from '../file-details/collapse';
import { useMetadataStatus } from '../../../../hooks';

import './index.css';

const PreviewDetails = React.memo(({ dirent, direntDetail }) => {
  const { enableMetadataManagement, enableMetadata } = useMetadataStatus();

  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const lastModifierField = useMemo(() => ({ type: CellType.LAST_MODIFIER, name: gettext('Last modifier') }), []);
  const lastModifiedTimeField = useMemo(() => ({ type: CellType.MTIME, name: gettext('Last modified time') }), []);

  const dom = (
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
      {enableMetadataManagement && enableMetadata && (
        <MetadataDetails />
      )}
    </>
  );

  let component = dom;
  if (Utils.imageCheck(dirent.name) || Utils.videoCheck(dirent.name)) {

    component = (
      <>
        <Collapse title={gettext('General information')}>
          {dom}
        </Collapse>
        <div className="lightbox-side-panel-divider"></div>
      </>
    );
  }

  return (
    <>
      {component}
    </>
  );
}, (props, nextProps) => {
  const { repoID, repoInfo, dirent, path, direntDetail } = props;
  const isChanged = (
    repoID !== nextProps.repoID ||
    path !== nextProps.path ||
    !ObjectUtils.isSameObject(repoInfo, nextProps.repoInfo) ||
    !ObjectUtils.isSameObject(dirent, nextProps.dirent) ||
    !ObjectUtils.isSameObject(direntDetail, nextProps.direntDetail)
  );
  return !isChanged;
});

PreviewDetails.propTypes = {
  repoID: PropTypes.string,
  repoInfo: PropTypes.object,
  dirent: PropTypes.object,
  path: PropTypes.string,
  direntDetail: PropTypes.object,
};

export default PreviewDetails;
