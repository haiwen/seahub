import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

function WikiCardItemAdd(props) {
  return (
    <div
      className={'wiki-card-item wiki-card-item-add d-flex flex-column align-items-center justify-content-center'}
      onClick={props.toggelAddWikiDialog}
    >
      <span>+</span>
      <span>{gettext('Add Wiki')}</span>
    </div>
  );
}

WikiCardItemAdd.propTypes = {
  toggelAddWikiDialog: PropTypes.func.isRequired,
};

export default WikiCardItemAdd;
