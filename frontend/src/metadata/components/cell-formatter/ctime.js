import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { formatWithTimezone } from '../../../utils/time';
import { lang } from '@/utils/constants';

const CTimeFormatter = ({ value, className, children: emptyFormatter, format }) => {
  if (!value) return emptyFormatter || null;
  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container ctime-formatter', className)}
      title={formatWithTimezone(value)}
    >
      {format == 'relativeTime' ? dayjs.unix(value).locale(lang).fromNow() : dayjs(value).format('YYYY-MM-DD HH:mm:ss')}
    </div>
  );
};

CTimeFormatter.propTypes = {
  format: PropTypes.string,
  value: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default CTimeFormatter;
