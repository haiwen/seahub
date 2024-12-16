import React, { useCallback, useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { GalleryGroupBySetter, GallerySliderSetter, SortSetter } from '../../data-process-setter';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE, FACE_RECOGNITION_VIEW_ID, VIEW_TYPE } from '../../../constants';

const FaceRecognitionViewToolbar = ({ readOnly, isCustomPermission, onToggleDetail }) => {
  const [isShow, setShow] = useState(false);
  const [view, setView] = useState({});

  const viewColumns = useMemo(() => {
    if (!view) return [];
    return view.columns;
  }, [view]);

  const onToggle = useCallback((isShow) => {
    setShow(isShow);
  }, []);

  const setRecognitionView = useCallback(view => {
    setView(view);
  }, []);

  const modifySorts = useCallback((sorts) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.FACE_RECOGNITION_VIEW_CHANGE, { sorts });
  }, []);

  useEffect(() => {
    const unsubscribeToggle = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_VIEW_TOOLBAR, onToggle);
    const unsubscribeView = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.FACE_RECOGNITION_VIEW, setRecognitionView);
    return () => {
      unsubscribeToggle && unsubscribeToggle();
      unsubscribeView && unsubscribeView();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isShow) return null;

  return (
    <>
      <div className="sf-metadata-tool-left-operations">
        <GalleryGroupBySetter view={{ _id: FACE_RECOGNITION_VIEW_ID }} />
        <GallerySliderSetter view={{ _id: FACE_RECOGNITION_VIEW_ID }} />
        <SortSetter
          isNeedSubmit={true}
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-sort"
          target="sf-metadata-sort-popover"
          readOnly={readOnly}
          sorts={view.sorts}
          type={VIEW_TYPE.FACE_RECOGNITION}
          columns={viewColumns}
          modifySorts={modifySorts}
        />
        {!isCustomPermission && (
          <div className="cur-view-path-btn ml-2" onClick={onToggleDetail}>
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
  readOnly: PropTypes.bool,
  onToggleDetail: PropTypes.func,
};

export default FaceRecognitionViewToolbar;
