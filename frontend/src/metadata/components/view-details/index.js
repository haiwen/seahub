import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { gettext, mediaUrl } from '../../../utils/constants';
import { Detail, Header, Body } from '../../../components/dirent-detail/detail';
import EmptyTip from '../../../components/empty-tip';
import { useMetadata } from '../../hooks';
import { VIEW_TYPE_ICON, VIEW_TYPES_SUPPORT_SHOW_DETAIL } from '../../constants';

import './index.css';

const ViewDetails = ({ viewId, onClose }) => {
  const { idViewMap } = useMetadata();

  const view = useMemo(() => idViewMap[viewId], [viewId, idViewMap]);
  const icon = useMemo(() => {
    const type = view?.type;
    return `${mediaUrl}favicons/${VIEW_TYPE_ICON[type]}.png`;
  }, [view]);

  if (!view || !VIEW_TYPES_SUPPORT_SHOW_DETAIL.includes(view.type)) return null;

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
