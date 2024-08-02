import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import ExtraMetadataAttributesDialog from '../../../dialog/extra-metadata-attributes-dialog';
import { gettext } from '../../../../utils/constants';
import Icon from '../../../icon';

import './index.css';

const EditMetadata = ({ repoID, direntPath, direntType, direntDetail }) => {
  const [isShowDialog, setShowDialog] = useState(false);
  const onToggle = useCallback(() => {
    setShowDialog(!isShowDialog);
  }, [isShowDialog]);

  return (
    <>
      <div className="detail-edit-metadata-btn" onClick={onToggle}>
        <Icon symbol="add-table" />
        <span className="detail-edit-metadata-btn-title">{gettext('Edit metadata properties')}</span>
      </div>
      {isShowDialog && (
        <ExtraMetadataAttributesDialog
          repoID={repoID}
          filePath={direntPath}
          direntType={direntType}
          direntDetail={direntDetail}
          onToggle={onToggle}
        />
      )}
    </>
  );
};

EditMetadata.propTypes = {
  repoID: PropTypes.string,
  direntPath: PropTypes.string,
  direntType: PropTypes.string,
  direntDetail: PropTypes.object,
};

export default EditMetadata;
