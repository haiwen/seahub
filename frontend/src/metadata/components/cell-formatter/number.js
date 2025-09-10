import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getNumberDisplayString } from '../../utils/cell/column/number';

const NumberFormatter = ({ value, formats, className, children: emptyFormatter }) => {
  const validValue = useMemo(() => {
    console.log('NumberFormatter: Formatting value', { value, formats });
    return getNumberDisplayString(value, formats);
  }, [value, formats]);

  if (!validValue) return emptyFormatter || null;
  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container text-formatter number-formatter', className)}
      title={validValue}
    >
      {validValue}
    </div>
  );
};

NumberFormatter.propTypes = {
  value: PropTypes.any,
  formats: PropTypes.object,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default NumberFormatter;
