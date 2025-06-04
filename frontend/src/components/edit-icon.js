import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';

function EditIcon({ onClick }) {
  return (
    <i
      role="button"
      title={gettext('Edit')}
      aria-label={gettext('Edit')}
      className="sf3-font sf3-font-rename op-icon op-icon-bg-light ml-1"
      onClick={onClick}>
    </i>
  );
}

EditIcon.propTypes = {
  onClick: PropTypes.func.isRequired
};

export default EditIcon;
