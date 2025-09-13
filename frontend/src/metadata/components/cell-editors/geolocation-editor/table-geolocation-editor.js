import React, { useState, useCallback, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { Modal } from 'reactstrap';
import GeolocationEditor from './index';
import { PRIVATE_COLUMN_KEY } from '../../../constants';
import { getRecordIdFromRecord } from '../../../utils/cell';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';

import './table-geolocation-editor.css';

const TableGeolocationEditor = forwardRef(({ value, onCommit, onClose, record, column, columns, ...props }, ref) => {
  const [isFullScreen, setFullScreen] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isReadyToEraseLocation, setReadyToEraseLocation] = useState(false);
  const [editorStyle, setEditorStyle] = useState({ visibility: 'hidden' });
  const [isMapReady, setMapReady] = useState(false);
  const editorRef = useRef(null);

  const editorIdRef = useRef(`table-editor-${record?._id || 'default'}-${Date.now()}`);

  useImperativeHandle(ref, () => ({
    onClose: () => closeEditor()
  }));

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!isFullScreen && editorRef.current) {
      const editorElement = editorRef.current;
      const parent = editorElement.parentElement;

      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        const editorWidth = 500;
        const editorHeight = 434;

        const cellWidth = parentRect.width;
        const cellHeight = parentRect.height;

        let adjustedStyle = {
          position: 'absolute',
          zIndex: '1050',
          width: `${editorWidth}px`,
          height: `${editorHeight}px`,
          visibility: isMapReady ? 'visible' : 'hidden'
        };

        let left = (cellWidth - editorWidth) / 2;
        let top = cellHeight + 5;

        const rightEdge = parentRect.left + left + editorWidth;
        if (rightEdge > viewportWidth) {
          left = viewportWidth - parentRect.left - editorWidth - 10;
        }
        if (parentRect.left + left < 0) {
          left = -parentRect.left + 10;
        }

        const bottomEdge = parentRect.top + top + editorHeight;
        if (bottomEdge > viewportHeight) {
          top = -editorHeight - 5;

          if (parentRect.top + top < 0) {
            top = -parentRect.top + 10;
          }
        }

        adjustedStyle.left = `${left}px`;
        adjustedStyle.top = `${top}px`;

        setEditorStyle(adjustedStyle);
      }
    }
  }, [isFullScreen, isMapReady]);

  const closeEditor = useCallback(() => {
    if (isReadyToEraseLocation) {
      const repoID = window.sfMetadataContext.getSetting('repoID');
      const recordId = getRecordIdFromRecord(record);

      window.sfMetadataContext.modifyRecord(repoID, recordId, {
        [PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED]: null
      }).then(() => {
        return window.sfMetadataContext.modifyRecord(repoID, recordId, {
          [PRIVATE_COLUMN_KEY.LOCATION]: null
        });
      }).then(() => {
        setCurrentValue(null);
        onClose && onClose();
      }).catch((error) => {
        toaster.danger(gettext('Failed to clear location data'));
      });
    } else {
      onClose && onClose();
    }
  }, [isReadyToEraseLocation, onClose, record]);

  const onFullScreen = useCallback(() => {
    setFullScreen(!isFullScreen);
  }, [isFullScreen]);

  const onSubmit = useCallback((locationData) => {
    const { position, location_translated } = locationData;

    const repoID = window.sfMetadataContext.getSetting('repoID');
    const recordId = getRecordIdFromRecord(record);

    window.sfMetadataContext.modifyRecord(repoID, recordId, {
      [PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED]: location_translated
    }).then(() => {
      return window.sfMetadataContext.modifyRecord(repoID, recordId, {
        [PRIVATE_COLUMN_KEY.LOCATION]: position
      });
    }).then(() => {
      setCurrentValue(position);
      setFullScreen(false);
      onClose && onClose();
    }).catch((error) => {
      toaster.danger(gettext('Failed to save location data'));
    });
  }, [record, onClose]);

  const onReadyToEraseLocation = useCallback(() => {
    setReadyToEraseLocation(true);
  }, []);

  const locationTranslated = record?._location_translated || null;

  return (
    <div className="sf-table-geolocation-editor" ref={editorRef} style={editorStyle}>
      {!isFullScreen ? (
        <GeolocationEditor
          editorId={editorIdRef.current}
          position={currentValue}
          locationTranslated={locationTranslated}
          onSubmit={onSubmit}
          onFullScreen={onFullScreen}
          onReadyToEraseLocation={onReadyToEraseLocation}
          onMapReady={handleMapReady}
        />
      ) : (
        <Modal
          size='lg'
          isOpen={true}
          toggle={onFullScreen}
          zIndex={1052}
        >
          <GeolocationEditor
            editorId={`${editorIdRef.current}-fullscreen`}
            position={currentValue}
            locationTranslated={locationTranslated}
            isFullScreen={isFullScreen}
            onSubmit={onSubmit}
            onFullScreen={onFullScreen}
            onReadyToEraseLocation={onReadyToEraseLocation}
            onMapReady={handleMapReady}
          />
        </Modal>
      )}
    </div>
  );
});

TableGeolocationEditor.displayName = 'TableGeolocationEditor';

export default TableGeolocationEditor;
