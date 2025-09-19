import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import dayjs from 'dayjs';

const CTimeFormatter = ({ value, className, children: emptyFormatter, format }) => {
  if (!value) return emptyFormatter || null;

  const valueFormat = format == 'relativeTime'
    ? dayjs(value).fromNow()
    : dayjs(value).format('YYYY-MM-DD HH:mm:ss');
  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container ctime-formatter', className)}
      title={valueFormat}
    >
      {valueFormat}
    </div>
  );
};

CTimeFormatter.propTypes = {
  value: PropTypes.string.isRequired,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default CTimeFormatter;
