import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { getDateDisplayString } from '../../../utils/cell/column/date';

import './index.css';

const DateFormatter = ({ value, format, className, children: emptyFormatter }) => {
  const displayValue = useMemo(() => {
    return getDateDisplayString(value, format);
  }, [value, format]);

  if (!displayValue) return emptyFormatter || null;
  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container date-formatter', className)}
      title={dayjs(value).format('dddd, MMMM D, YYYY h:mm:ss A')}
    >
      {displayValue}
    </div>
  );
};

DateFormatter.propTypes = {
  value: PropTypes.any,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default DateFormatter;
