import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
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
      title={displayValue}
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
