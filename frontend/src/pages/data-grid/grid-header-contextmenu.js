import React from 'react';
import PropTypes from 'prop-types';
import { Menu } from '@seafile/react-data-grid-addons';

const propTypes = {
  id: PropTypes.string.isRequired,
  column: PropTypes.object,
  onColumnRename: PropTypes.func,
};

class GridHeaderContextMenu extends React.Component {

  onColumnDelete = (e, data) => {
    if (typeof(this.props.onColumnDelete) === 'function') {
      this.props.onColumnDelete(e, data);
    }
  }

  render() {
    let { id, column } = this.props;
    return (
      <Menu.ContextMenu id={id}>
        <Menu.MenuItem data={{ column }} onClick={this.onColumnDelete}>Delete</Menu.MenuItem>
      </Menu.ContextMenu>
    );
  }
}

GridHeaderContextMenu.propTypes = propTypes;

export default GridHeaderContextMenu;


