import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { formatWithTimezone } from '../../../utils/time';

const CTimeFormatter = ({ value, className, children: emptyFormatter, format, record }) => {
  const displayValue = useMemo(() => {
    if (value) return value;
    if (dayjs.isDayjs(record?._mtime)) {
      return record._mtime.valueOf();
    }
    return null;
  }, [value, record]);

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
  record: PropTypes.object,
};

export default CTimeFormatter;
