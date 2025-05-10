import React from 'react';
import PropTypes from 'prop-types';

const OptionsContainer = ({ inputRef, options }) => {
  if (!Array.isArray(options) || options.length === 0) return null;
  return (
    <div className="sf-metadata-select-options-list" ref={inputRef}>
      {options}
    </div>
  );
};

OptionsContainer.propTypes = {
  inputRef: PropTypes.any,
  options: PropTypes.array
};

export default OptionsContainer;
