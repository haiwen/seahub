import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import SelectOption from '../select-option';
import { gettext } from '../../../../utils/constants';
import { DELETED_OPTION_BACKGROUND_COLOR, DELETED_OPTION_TIPS } from '../../../constants';

import './index.css';

const MultipleSelectFormatter = ({ value, options, fontSize, className, children: emptyFormatter }) => {
  const displayOptions = useMemo(() => {
    if (!Array.isArray(value) || value.length === 0) return [];
    const selectedOptions = options.filter((option) => value.includes(option.id) || value.includes(option.name));
    const invalidOptionIds = value.filter(optionId => optionId && !options.find(o => o.id === optionId || o.name === optionId));
    const invalidOptions = invalidOptionIds.map(optionId => ({
      id: optionId,
      name: gettext(DELETED_OPTION_TIPS),
      color: DELETED_OPTION_BACKGROUND_COLOR,
    }));
    return [...selectedOptions, ...invalidOptions];
  }, [options, value]);

  if (displayOptions.length === 0) return emptyFormatter || null;
  return (
    <div className={classnames('sf-metadata-ui cell-formatter-container multiple-select-formatter', className)}>
      {displayOptions.map(option => {
        return (<SelectOption key={option.id} option={option} fontSize={fontSize} />);
      })}
    </div>
  );
};

MultipleSelectFormatter.propTypes = {
  value: PropTypes.array,
  options: PropTypes.array,
  fontSize: PropTypes.number,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default MultipleSelectFormatter;
