import React, { useState, useCallback, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { Modal } from 'reactstrap';
import GeolocationEditor from './index';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../../constants';
import { getRecordIdFromRecord } from '../../../utils/cell';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';

import './table-geolocation-editor.css';

const TableGeolocationEditor = forwardRef(({ value, onCommit, onClose, record, column, columns, ...props }, ref) => {
  const [isFullScreen, setFullScreen] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isReadyToEraseLocation, setReadyToEraseLocation] = useState(false);
  const [editorStyle, setEditorStyle] = useState({ visibility: 'hidden' }); // Start hidden to prevent flash
  const [editorKey, setEditorKey] = useState(Date.now()); // Add key to force re-mount
  const [isMapReady, setMapReady] = useState(false); // Track map initialization
  const editorRef = useRef(null);

  useImperativeHandle(ref, () => ({
    onClose: () => closeEditor()
  }));

  // Force re-mount of GeolocationEditor when value or locationTranslated changes
  useEffect(() => {
    setEditorKey(Date.now());
    setMapReady(false); // Reset map ready state on re-mount
  }, [value, record?._location_translated]);

  // Handle map ready callback
  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  // Calculate viewport-aware positioning
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
          visibility: isMapReady ? 'visible' : 'hidden' // Show only when map is ready
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
  }, [isFullScreen, isMapReady]); // Add isMapReady to dependencies

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
        setReadyToEraseLocation(false);
        if (window.sfMetadataContext?.eventBus) {
          const updates = {
            [PRIVATE_COLUMN_KEY.LOCATION]: null,
            [PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED]: null
          };
          window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { recordId }, updates);
        }
      }).catch((error) => {
        toaster.danger(gettext('Failed to modify records'));
      });
    }
    onClose && onClose();
  }, [isReadyToEraseLocation, onClose, record]);

  const onFullScreen = useCallback(() => {
    setFullScreen(!isFullScreen);
  }, [isFullScreen]);

  const onSubmit = useCallback((locationData) => {
    const { position, location_translated } = locationData;

    // Update location data using direct API calls
    const repoID = window.sfMetadataContext.getSetting('repoID');
    const recordId = getRecordIdFromRecord(record);

    // First update location_translated, then location
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

      // Dispatch local update event for real-time UI updates
      if (window.sfMetadataContext?.eventBus) {
        const updates = {
          [PRIVATE_COLUMN_KEY.LOCATION]: position,
          [PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED]: location_translated
        };
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { recordId }, updates);
      }
    }).catch((error) => {
      toaster.danger(gettext('Failed to modify records'));
    });
  }, [record, onClose]);

  const onReadyToEraseLocation = useCallback(() => {
    setReadyToEraseLocation(true);
  }, []);

  // Get stored location_translated data from record
  const locationTranslated = record?._location_translated || null;

  return (
    <div className="sf-table-geolocation-editor" ref={editorRef} style={editorStyle}>
      {!isFullScreen ? (
        <GeolocationEditor
          key={editorKey}
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
            key={editorKey}
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

export default TableGeolocationEditor;
