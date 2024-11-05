import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { gettext, mediaUrl } from '../../../utils/constants';
import { Detail, Header, Body } from '../../../components/dirent-detail/detail';
import EmptyTip from '../../../components/empty-tip';
import { useMetadata } from '../../hooks';
import { VIEW_TYPE } from '../../constants';

import './index.css';

const ViewDetails = ({ viewId, onClose }) => {
  const { viewsMap } = useMetadata();

  const view = useMemo(() => viewsMap[viewId], [viewId, viewsMap]);
  const icon = useMemo(() => {
    const type = view.type;
    if (type === VIEW_TYPE.GALLERY) return `${mediaUrl}favicons/gallery.png`;
    if (type === VIEW_TYPE.TABLE) return `${mediaUrl}favicons/table.png`;
    if (type === VIEW_TYPE.FACE_RECOGNITION) return `${mediaUrl}favicons/face-recognition-view.png`;
    return `${mediaUrl}img/file/256/file.png`;
  }, [view]);

  return (
    <Detail className="sf-metadata-view-detail">
      <Header title={view.name} icon={icon} iconSize={28} onClose={onClose} />
      <Body>
        <div className="detail-content detail-content-empty">
          <EmptyTip text={gettext('There is no information to display.')} />
        </div>
      </Body>
    </Detail>
  );
};

ViewDetails.propTypes = {
  viewId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ViewDetails;
