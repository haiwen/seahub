import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getNumberDisplayString } from '../../utils/cell/column/number';
import { ROW_HEIGHT } from '@/metadata/constants';

const NumberFormatter = ({ value, formats, className, children: emptyFormatter, height }) => {
  const numberRef = useRef(null);
  const [numberStyle, setNumberStyle] = useState({});
  const isDefaultRowHeight = useMemo(() => {
    return height === ROW_HEIGHT || height === ROW_HEIGHT - 1;
  }, [height]);
  const validValue = useMemo(() => getNumberDisplayString(value, formats), [value, formats]);

  useEffect(() => {
    if (!numberRef.current || isDefaultRowHeight) {
      setNumberStyle({});
      return;
    }

    const computedStyle = window.getComputedStyle(numberRef.current);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
    const availableHeight = numberRef.current.clientHeight;
    const maxVisibleLines = Math.max(Math.floor(availableHeight / lineHeight), 1);
    setNumberStyle({
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
      ref={numberRef}
      className={classnames('sf-metadata-ui cell-formatter-container text-formatter number-formatter', className, {
        'multi-line-text-formatter': !isDefaultRowHeight,
      })}
      style={numberStyle}
      title={validValue}
    >
      {validValue}
    </div>
  );
};

NumberFormatter.propTypes = {
  value: PropTypes.any,
  formats: PropTypes.object,
  height: PropTypes.number,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default NumberFormatter;
