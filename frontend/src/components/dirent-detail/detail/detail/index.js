import React, { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ResizeBar from '../../../resize-bar';
import { DRAG_HANDLER_HEIGHT } from '../../../resize-bar/constants';

import './index.css';

const Detail = ({ children, className }) => {
  const lastSettingsValue = localStorage.getItem('sf_cur_view_detail_width');
  const [width, setWidth] = useState(lastSettingsValue ? parseInt(lastSettingsValue) : 300);
  const [isResizing, setResizing] = useState(false);
  const resizeBarRef = useRef(null);
  const dragHandlerRef = useRef(null);

  const onResizeMouseMove = useCallback((e) => {
    const newWidth = Math.max(Math.min(window.innerWidth - e.clientX, 600), 300);
    if (width === newWidth) return;
    localStorage.setItem('sf_cur_view_detail_width', newWidth);
    setWidth(newWidth);
  }, [width]);

  const onResizeMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', onResizeMouseMove);
    window.removeEventListener('mouseup', onResizeMouseUp);
    isResizing && setResizing(false);
  }, [isResizing, onResizeMouseMove]);

  const onResizeMouseDown = useCallback(() => {
    window.addEventListener('mouseup', onResizeMouseUp);
    window.addEventListener('mousemove', onResizeMouseMove);
    setResizing(true);
  }, [onResizeMouseUp, onResizeMouseMove]);

  const setDragHandlerTop = useCallback((top) => {
    dragHandlerRef.current.style.top = top + 'px';
  }, []);

  const onResizeMouseOver = useCallback((event) => {
    if (!dragHandlerRef.current) return;
    const { top } = resizeBarRef.current.getBoundingClientRect();
    const dragHandlerRefTop = event.pageY - top - DRAG_HANDLER_HEIGHT / 2;
    setDragHandlerTop(dragHandlerRefTop);
  }, [setDragHandlerTop]);

  return (
    <div
      className={classnames('cur-view-detail', className)}
      style={{ width }}
    >
      {children}
      <ResizeBar
        resizeBarRef={resizeBarRef}
        dragHandlerRef={dragHandlerRef}
        resizeBarStyle={{ left: -1 }}
        dragHandlerStyle={{ height: DRAG_HANDLER_HEIGHT }}
        onResizeMouseDown={onResizeMouseDown}
        onResizeMouseOver={onResizeMouseOver}
      />
    </div>
  );

};

Detail.propTypes = {
  className: PropTypes.string,
  children: PropTypes.any,
};

export default Detail;
