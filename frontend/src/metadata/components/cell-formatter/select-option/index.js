import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

import './index.css';

const SelectOption = ({ option, fontSize }) => {
  const style = useMemo(() => {
    return {
      display: 'inline-block',
      padding: '0px 10px',
      height: '20px',
      lineHeight: '20px',
      textAlign: 'center',
      borderRadius: '10px',
      maxWidth: '250px',
      fontSize: fontSize ? fontSize : 13,
      backgroundColor: option.color,
      color: option.textColor || null,
    };
  }, [option, fontSize]);

  return (
    <div className="sf-metadata-ui-select-option text-truncate" style={style} title={option.name}>
      {option.name}
    </div>
  );
};

SelectOption.propTypes = {
  option: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  }),
  fontSize: PropTypes.number,
};

export default SelectOption;
