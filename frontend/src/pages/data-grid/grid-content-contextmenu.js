import React from 'react';
import PropTypes from 'prop-types';
import { Menu } from '@seafile/react-data-grid-addons';

const propTypes = {
  id: PropTypes.string.isRequired,
  idx: PropTypes.number,
  rowIdx: PropTypes.number,
  onRowDelete: PropTypes.func.isRequired,
};

class GridContentContextMenu extends React.Component {

  onRowDelete = (e, data) => {
    if (typeof(this.props.onRowDelete) === 'function') {
      this.props.onRowDelete(e, data);
    }
  };

  render() {
    const { idx, id, rowIdx } = this.props;

    return (
      <Menu.ContextMenu id={id}>
        <Menu.MenuItem data={{ rowIdx, idx }} onClick={this.onRowDelete}>Delete Row</Menu.MenuItem>
      </Menu.ContextMenu>
    );
  }
}

GridContentContextMenu.propTypes = propTypes;

export default GridContentContextMenu;