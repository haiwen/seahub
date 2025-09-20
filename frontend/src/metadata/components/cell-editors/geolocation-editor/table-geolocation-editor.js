import React, { useState, useCallback, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { Modal } from 'reactstrap';
import GeolocationEditor from './index';

import './table-geolocation-editor.css';

const TableGeolocationEditor = forwardRef(({ value, onCommit, onClose, record, column, columns, ...props }, ref) => {
  const [isFullScreen, setFullScreen] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [editorStyle, setEditorStyle] = useState({ visibility: 'hidden' });
  const [isMapReady, setMapReady] = useState(false);
  const editorRef = useRef(null);

  const latestValueRef = useRef({ position: currentValue, location_translated: record?._location_translated || null });

  useImperativeHandle(ref, () => ({
    getValue: () => latestValueRef.current,
    onClose: () => {
      setFullScreen(false);
      onClose && onClose();
    }
  }));

  useEffect(() => {
    latestValueRef.current = {
      position: currentValue,
      location_translated: record?._location_translated || null
    };
  }, [currentValue, record?._location_translated]);

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

  const onFullScreen = useCallback(() => {
    setFullScreen(!isFullScreen);
  }, [isFullScreen]);

  const onSubmit = useCallback((locationData) => {
    const { position, location_translated } = locationData;
    latestValueRef.current = { position, location_translated };
    setCurrentValue(position);
    setFullScreen(false);
    onClose && onClose();
  }, [onClose]);

  const onDeleteLocation = useCallback(() => {
    latestValueRef.current = { position: null, location_translated: null };
    setCurrentValue(null);
    setFullScreen(false);
    onClose && onClose();
  }, [onClose]);

  const locationTranslated = record?._location_translated || null;

  return (
    <div className="sf-table-geolocation-editor" ref={editorRef} style={editorStyle}>
      {!isFullScreen ? (
        <GeolocationEditor
          position={currentValue}
          locationTranslated={locationTranslated}
          onSubmit={onSubmit}
          onFullScreen={onFullScreen}
          onDeleteLocation={onDeleteLocation}
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
            position={currentValue}
            locationTranslated={locationTranslated}
            isFullScreen={isFullScreen}
            onSubmit={onSubmit}
            onFullScreen={onFullScreen}
            onDeleteLocation={onDeleteLocation}
            onMapReady={handleMapReady}
          />
        </Modal>
      )}
    </div>
  );
});

TableGeolocationEditor.displayName = 'TableGeolocationEditor';

export default TableGeolocationEditor;
