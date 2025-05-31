import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';

const EditIcon = (props) => {
  return (
    <span
      role="button"
      title={gettext('Edit')}
      aria-label={gettext('Edit')}
      className="sf3-font sf3-font-rename attr-action-icon"
      onClick={props.onClick}>
    </span>
  );
};

EditIcon.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default EditIcon;
