import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getType } from '../../../utils/utils';
import { ROW_HEIGHT } from '@/metadata/constants';

const TextFormatter = ({ value, className, children: emptyFormatter, height }) => {
  const textRef = useRef(null);
  const [textStyle, setTextStyle] = useState({});
  const isDefaultRowHeight = useMemo(() => {
    return height === ROW_HEIGHT || height === ROW_HEIGHT - 1;
  }, [height]);
  const validValue = useMemo(() => {
    if (typeof value === 'number') return value + '';
    if (typeof value === 'object') return null;
    if (getType(value) === 'Boolean') return value + '';
    return value;
  }, [value]);

  useEffect(() => {
    if (!textRef.current || isDefaultRowHeight) {
      setTextStyle({});
      return;
    }

    const computedStyle = window.getComputedStyle(textRef.current);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 22;
    const availableHeight = textRef.current.clientHeight;
    const maxVisibleLines = Math.max(Math.floor(availableHeight / lineHeight), 1);
    setTextStyle({
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: maxVisibleLines,
      lineClamp: String(maxVisibleLines),
      lineHeight: `${lineHeight}px`,
      maxHeight: `${maxVisibleLines * lineHeight}px`,
    });
  }, [height, isDefaultRowHeight, validValue]);

  if (!validValue) return emptyFormatter || null;
  return (
    <div
      ref={textRef}
      className={classnames('sf-metadata-ui cell-formatter-container text-formatter', className, {
        'multi-line-text-formatter': !isDefaultRowHeight,
      })}
      style={textStyle}
      title={validValue}
    >
      {validValue}
    </div>
  );
};

TextFormatter.propTypes = {
  value: PropTypes.any,
  height: PropTypes.number,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default TextFormatter;
