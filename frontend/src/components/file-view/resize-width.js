import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import '../../css/resize-width.css';

const ResizeWidth = ({ minWidth, maxWidth, resizeWidth: resizeWidthAPI, resizeWidthEnd }) => {
  const [isShowHandlerBar, setIsShowHandlerBar] = useState(false);
  const [drag, setDrag] = useState(null);

  const handlerRef = useRef(null);
  const handlerBarRef = useRef(null);


  const setHandlerBarTop = (handlerTop) => {
    if (!handlerBarRef.current || handlerTop < 0) return;
    handlerBarRef.current.style.top = handlerTop + 'px';
  };

  const setHandlerBarPosition = (event) => {
    if (!handlerRef.current) return;
    const { top } = handlerRef.current.getBoundingClientRect();
    const handlerTop = event.pageY - top - 26 / 2;
    setHandlerBarTop(handlerTop);
  };

  const getWidthFromMouseEvent = (event) => {
    return event.pageX || (event.touches && event.touches[0] && event.touches[0].pageX) ||
      (event.changedTouches && event.changedTouches[event.changedTouches.length - 1].pageX);
  };

  const calculateResizedWidth = (event) => {
    const width = getWidthFromMouseEvent(event);
    const resizedWidth = document.body.clientWidth - width;
    if ((minWidth && resizedWidth < minWidth) || (maxWidth && resizedWidth > maxWidth)) return -1;
    return resizedWidth;
  };

  const onResizeWidth = (event) => {
    const resizedWidth = calculateResizedWidth(event);
    if (resizedWidth < 0) return;
    if (resizeWidthAPI) {
      resizeWidthAPI(resizedWidth);
    }
  };

  const onDrag = (event) => {
    onResizeWidth(event);
  };

  const onDragStart = useCallback((event) => {
    if (event && event.dataTransfer && event.dataTransfer.setData) {
      event.dataTransfer.setData('text/plain', 'dummy');
    }
  }, []);

  const onDragEnd = (event) => {
    onResizeWidth(event);
  };

  const onMouseLeave = () => {
    setIsShowHandlerBar(false);
  };

  const onMouseEnter = (event) => {
    setIsShowHandlerBar(true);
    setHandlerBarPosition(event);
    if (handlerRef.current) {
      handlerRef.current.addEventListener('mouseleave', onMouseLeave);
    }
  };

  const onMouseOver = (event) => {
    setHandlerBarPosition(event);
  };

  const onMouseDown = (event) => {
    event.preventDefault && event.preventDefault();
    const currDrag = onDragStart(event);
    if (currDrag === null && event.button !== 0) return;

    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    if (handlerRef.current) {
      handlerRef.current.removeEventListener('mouseleave', onMouseLeave);
    }

    setDrag(currDrag);
  };

  const onMouseMove = (event) => {
    event.preventDefault && event.preventDefault();
    if (!drag === null) return;
    onDrag(event);
  };

  const onMouseUp = (event) => {
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('mousemove', onMouseMove);
    onDragEnd(event, drag);
    setHandlerBarTop(-9999);
    setDrag(null);
    setIsShowHandlerBar(false);
    if (resizeWidthEnd) {
      const resizeWidth = calculateResizedWidth(event);
      if (resizeWidth < 0) return;
      resizeWidthEnd(resizeWidth);
    }
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };

    // eslint-disable-next-line
  }, []);

  return (
    <div
      className="seafile-resize-width-handler resize-handler-placement-right"
      ref={handlerRef}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
      onMouseEnter={onMouseEnter}
      onDrag={onDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ zIndex: 102 }}
    >
      <div className="seafile-resize-width-handler-content">
        {isShowHandlerBar && (
          <div className="seafile-resize-width-handler-bar" ref={handlerBarRef} style={{ height: 26 }}></div>
        )}
      </div>
    </div>
  );
};

ResizeWidth.propTypes = {
  minWidth: PropTypes.number,
  maxWidth: PropTypes.number,
  resizeWidth: PropTypes.func,
  resizeWidthEnd: PropTypes.func,
};

export default ResizeWidth;
