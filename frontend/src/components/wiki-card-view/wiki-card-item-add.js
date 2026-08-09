import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Icon from '../icon';

function WikiCardItemAdd(props) {
  return (
    <div
      className="wiki-card-item wiki-card-item-add d-flex flex-column align-items-center justify-content-center"
      onClick={props.toggleAddWikiDialog}
      onKeyDown={Utils.onKeyDown}
      role="button"
      tabIndex="0"
    >
      <Icon symbol="new" className="wiki-card-item-add-icon" />
      <span className="wiki-card-item-add-label">{gettext('Add Wiki')}</span>
    </div>
  );
}

WikiCardItemAdd.propTypes = {
  toggleAddWikiDialog: PropTypes.func.isRequired,
};

export default WikiCardItemAdd;
