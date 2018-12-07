import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  menuPosition: PropTypes.object.isRequired,
  onRenameToggle: PropTypes.func.isRequired,
  onDeleteToggle: PropTypes.func.isRequired,
};

class WikiMenu extends React.Component {

  render() {
    let menuPosition = this.props.menuPosition;
    let style = {position: 'fixed', top: menuPosition.top, left: menuPosition.left, display: 'block'};

    return (
      <ul className="dropdown-menu" style={style}>
        <li className="dropdown-item" onClick={this.props.onRenameToggle}>{gettext('Rename')}</li>
        <li className="dropdown-item" onClick={this.props.onDeleteToggle}>{gettext('Delete')}</li>
      </ul>
    );
  }
}

WikiMenu.propTypes = propTypes;

export default WikiMenu;
