import React, { useCallback, useMemo, useState, useEffect } from 'react';
import FilePreviewWrapper from './wiki-preview';
import ResizeWidth from '../../../components/file-view/resize-width';
import { WIKI_RIGHT_PANEL_WIDTH } from '../constant';
import LocalStorage from '../../../utils/local-storage-utils';

import './index.css';

const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 620;

const WikiRightPanel = (props) => {
  const [width, setWidth] = useState(MIN_PANEL_WIDTH);

  const panelWrapperStyle = useMemo(() => {
    let style = {
      width,
      zIndex: 101,
    };
    if (!style.width || style.width < MIN_PANEL_WIDTH) {
      style.width = MIN_PANEL_WIDTH;
    } else if (style.width > MAX_PANEL_WIDTH) {
      style.width = MAX_PANEL_WIDTH;
    }
    return style;
  }, [width]);

  const resizeWidth = useCallback((width) => {
    setWidth(width);
  }, []);

  const resizeWidthEnd = useCallback((width) => {
    const settings = LocalStorage.getItem(WIKI_RIGHT_PANEL_WIDTH) || {};
    LocalStorage.setItem(WIKI_RIGHT_PANEL_WIDTH, JSON.stringify({ ...settings, previewPanelWidth: width }));
  }, []);

  useEffect(() => {
    const settings = LocalStorage.getItem(WIKI_RIGHT_PANEL_WIDTH) || {};
    const { previewPanelWidth } = settings;
    const width = Math.max(MIN_PANEL_WIDTH, Math.min(parseInt(previewPanelWidth, 10) || MIN_PANEL_WIDTH, MAX_PANEL_WIDTH));
    setWidth(width);
  }, []);

  return (
    <div className="wiki-content-right-panel-wrapper" style={panelWrapperStyle}>
      <ResizeWidth minWidth={MIN_PANEL_WIDTH} maxWidth={MAX_PANEL_WIDTH} resizeWidth={resizeWidth} resizeWidthEnd={resizeWidthEnd} />
      <div className="wiki-content-right-panel">
        {<FilePreviewWrapper width={width} {...props} />}
      </div>
    </div>
  );
};

export default WikiRightPanel;
