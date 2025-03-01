import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import MarkdownViewer from './viewer';

import './index.css';

const LongTextPreview = React.memo(({ value, className, targetStyle, onMouseEnter, onMouseLeave }) => {
  const ref = useRef(null);
  const [localStyle, setLocalStyle] = useState({ height: 450, opacity: 0 });

  useEffect(() => {
    setTimeout(() => {
      if (!ref.current) return;
      // If image is included, sets the preview height to the maximum height
      const hasImage = value?.images?.length >= 2 ? true : false;
      let { height: domHeight } = ref.current.getBoundingClientRect();
      domHeight = hasImage ? 450 : domHeight;
      setLocalStyle({ height: Math.min(domHeight, 450), opacity: 1 });
    }, 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseEnter = useCallback((event) => {
    onMouseEnter && onMouseEnter(event);
  }, [onMouseEnter]);

  const handleMouseLeave = useCallback((event) => {
    onMouseLeave && onMouseLeave(event);
  }, [onMouseLeave]);

  const handleClick = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  }, []);

  const style = useMemo(() => {
    let { left, top } = targetStyle;
    const { height, opacity } = localStyle;
    const width = 520;
    const padding = 6;
    left = left - width > 0 ? left - width - 12 : 0;
    top = top - padding;
    if (top + height > window.innerHeight) {
      top = top - height > 0 ? top - height : 0;
    }
    return { left, top, opacity };
  }, [targetStyle, localStyle]);

  const markdownContent = value ? value.text : '';
  return (
    <div
      className={classnames('sf-metadata-long-text-preview', className)}
      style={style}
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="sf-metadata-longtext-container sf-metadata-longtext-container-scroll">
        <MarkdownViewer value={markdownContent} showTOC={false} />
      </div>
    </div>
  );
});

LongTextPreview.propTypes = {
  className: PropTypes.string,
  value: PropTypes.object,
  targetStyle: PropTypes.object,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
};

export default LongTextPreview;
