import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import IconBtn from '../../../../../components/icon-btn';
import { gettext } from '../../../../../utils/constants';
import { DELETED_OPTION_TIPS, DELETED_OPTION_BACKGROUND_COLOR } from '../../../../constants';

import './index.css';

const DeleteOption = ({ value, options, onDelete }) => {

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

  return (
    <div className="sf-metadata-delete-select-options">
      {displayOptions.map(option => {
        if (!option) return null;
        const { id, name } = option;
        const style = {
          display: 'inline-flex',
          padding: '0px 10px',
          height: '20px',
          lineHeight: '20px',
          textAlign: 'center',
          borderRadius: '10px',
          maxWidth: '250px',
          fontSize: 13,
          backgroundColor: option.color,
          color: option.textColor || null,
          fill: option.textColor || '#666',
        };
        return (
          <div key={id} className="sf-metadata-delete-select-option" style={style}>
            <span className="sf-metadata-delete-select-option-name text-truncate" title={name} aria-label={name}>{name}</span>
            <IconBtn className="sf-metadata-delete-select-remove" onClick={(event) => onDelete(id, event)} symbol="x-01" />
          </div>
        );
      })}
    </div>
  );
};

DeleteOption.propTypes = {
  value: PropTypes.array.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default DeleteOption;
