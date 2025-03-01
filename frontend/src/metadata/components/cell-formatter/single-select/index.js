import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import SelectOption from '../select-option';

import './index.css';

const SingleSelectFormatter = ({ value, options, fontSize, className, children: emptyFormatter }) => {
  const option = useMemo(() => {
    return options.find(item => item.id === value || item.name === value);
  }, [options, value]);

  if (!option) return emptyFormatter || null;
  return (
    <div className={classnames('sf-metadata-ui cell-formatter-container single-select-formatter', className)}>
      <SelectOption option={option} fontSize={fontSize} />
    </div>
  );
};

SingleSelectFormatter.propTypes = {
  value: PropTypes.string,
  options: PropTypes.array,
  fontSize: PropTypes.number,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default SingleSelectFormatter;
