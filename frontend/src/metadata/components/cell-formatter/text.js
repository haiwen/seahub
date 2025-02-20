import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getType } from '../../../utils/utils';

const TextFormatter = ({ value, className, children: emptyFormatter }) => {
  const validValue = useMemo(() => {
    if (typeof value === 'number') return value + '';
    if (typeof value === 'object') return null;
    if (getType(value) === 'Boolean') return value + '';
    return value;
  }, [value]);

  if (!validValue) return emptyFormatter || null;
  return (
    <div
      className={classnames('sf-metadata-ui cell-formatter-container text-formatter', className)}
      title={validValue}
    >
      {validValue}
    </div>
  );
};

TextFormatter.propTypes = {
  value: PropTypes.any,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default TextFormatter;
