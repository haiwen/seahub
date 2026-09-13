import React from 'react';
import PropTypes from 'prop-types';

const Empty = ({ fieldType, placeholder }) => {
  return (<span className={`sf-metadata-record-cell-empty sf-metadata-record-${fieldType}-cell-empty`} placeholder={placeholder}></span>);
};

Empty.propTypes = {
  fieldType: PropTypes.string,
  placeholder: PropTypes.string,
};

export default Empty;
