import React from 'react';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { formatWithTimezone } from '../../../../utils/time';

const LastModifiedFormatter = ({ value, className, children: emptyFormatter, format }) => {
  if (!value) return emptyFormatter || null;
  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container ctime-formatter', className)}
      title={formatWithTimezone(value)}
    >
      {dayjs.unix(value).format('YYYY-MM-DD HH:mm:ss')}
    </div>
  );
};

export default LastModifiedFormatter;

