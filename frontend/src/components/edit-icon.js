import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import IconBtn from './icon-btn';

function EditIcon({ onClick }) {
  return (
    <IconBtn symbol="rename" size={24} title={gettext('Edit')} className="op-icon op-icon-bg-light ml-1" onClick={onClick} />
  );
}

EditIcon.propTypes = {
  onClick: PropTypes.func.isRequired
};

export default EditIcon;
