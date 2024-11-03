import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { GalleryGroupBySetter, GallerySliderSetter } from '../../data-process-setter';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE } from '../../../constants';

const FaceRecognitionViewToolbar = ({ isCustomPermission, view, showDetail }) => {
  const [isShow, setShow] = useState(false);

  const onToggle = useCallback((isShow) => {
    setShow(isShow);
  }, []);

  useEffect(() => {
    const unsubscribeToggle = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_VIEW_TOOLBAR, onToggle);
    return () => {
      unsubscribeToggle && unsubscribeToggle();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isShow) return null;

  return (
    <>
      <div className="sf-metadata-tool-left-operations">
        <GalleryGroupBySetter view={view} />
        <GallerySliderSetter view={view} />
        {!isCustomPermission && (
          <div className="cur-view-path-btn ml-2" onClick={showDetail}>
            <span className="sf3-font sf3-font-info" aria-label={gettext('Properties')} title={gettext('Properties')}></span>
          </div>
        )}
      </div>
      <div className="sf-metadata-tool-right-operations"></div>
    </>
  );
};

FaceRecognitionViewToolbar.propTypes = {
  isCustomPermission: PropTypes.bool,
  view: PropTypes.object.isRequired,
  showDetail: PropTypes.func,
};

export default FaceRecognitionViewToolbar;
