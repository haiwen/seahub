import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

function WikiCardItemAdd(props) {
  return (
    <div
      className={'wiki-card-item wiki-card-item-add d-flex flex-column align-items-center justify-content-center'}
      onClick={props.toggleAddWikiDialog}
      onKeyDown={Utils.onKeyDown}
      role="button"
      tabIndex="0"
    >
      <span aria-hidden={true}>+</span>
      <span>{gettext('Add Wiki')}</span>
    </div>
  );
}

WikiCardItemAdd.propTypes = {
  toggleAddWikiDialog: PropTypes.func.isRequired,
};

export default WikiCardItemAdd;
