import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { formatWithTimezone } from '../../../utils/time';

const CTimeFormatter = ({ value, className, children: emptyFormatter, format }) => {
  const displayValue = useMemo(() => {
    if (dayjs.isDayjs(value)) {
      return value.valueOf();
    }
    if (typeof value === 'number') {
      // Some sources provide Unix seconds, normalize them to milliseconds
      return value < 1000000000000 ? value * 1000 : value;
    }
    return value;
  }, [value]);

  if (!displayValue) return emptyFormatter || null;

  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container ctime-formatter', className)}
      title={formatWithTimezone(displayValue)}
    >
      {format == 'relativeTime' ? dayjs(displayValue).fromNow() : dayjs(displayValue).format('YYYY-MM-DD HH:mm:ss')}
    </div>
  );
};

CTimeFormatter.propTypes = {
  format: PropTypes.string,
  value: PropTypes.any,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default CTimeFormatter;
