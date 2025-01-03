import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import '../../css/seahub-checkbox.css';

const SeahubCheckbox = ({ isSelected, highlight }) => {
  return (
    <div
      className={classnames('seahub-checkbox-icon', {
        'seahub-checkbox-icon-selected': isSelected,
      }, {
        'seahub-checkbox-icon-highlight': highlight,
      })}
    >
      <i className="sf2-icon-tick"></i>
    </div>
  );
};

SeahubCheckbox.propTypes = {
  isSelected: PropTypes.bool,
  highlight: PropTypes.bool,
};

export default SeahubCheckbox;
