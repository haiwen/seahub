import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { GalleryGroupBySetter, GallerySliderSetter, SortSetter } from '../../data-process-setter';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE, FACE_RECOGNITION_VIEW_ID, VIEW_TYPE } from '../../../constants';

const FaceRecognitionViewToolbar = ({ readOnly, isCustomPermission, view, showDetail }) => {
  const [isShow, setShow] = useState(false);
  const [columns, setColumns] = useState([]);

  const onToggle = useCallback((isShow, columns = []) => {
    setColumns(columns);
    setShow(isShow);
  }, []);

  const modifySorts = useCallback((sorts) => {
    console.log(sorts);
  }, []);

  useEffect(() => {
    const unsubscribeToggle = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_VIEW_TOOLBAR, onToggle, columns);
    return () => {
      unsubscribeToggle && unsubscribeToggle();
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
          columns={columns}
          modifySorts={modifySorts}
        />
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
