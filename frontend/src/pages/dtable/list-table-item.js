import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import DeleteTableDialog from '../../components/dialog/delete-table-dialog';
import ShareTableDialog from '../../components/dialog/share-table-dialog';
import Rename from '../../components/rename';

const propTypes = {
  table: PropTypes.object.isRequired,
  workspaceID: PropTypes.number.isRequired,
  renameTable: PropTypes.func.isRequired,
  deleteTable: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
};

class ListTableItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isTableRenaming: false,
      isTableDeleting: false,
      isTableSharing: false,
      dropdownOpen: false,
      active: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.isItemFreezed) {
      this.setState({ active: false });
    }
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        active: true
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        active: false
      });
    }
  }

  onRenameTableCancel = () => {
    this.setState({isTableRenaming: !this.state.isTableRenaming});
    this.props.onUnfreezedItem();
  }

  onRenameTableConfirm = (newTableName) => {
    let oldTableName = this.props.table.name;
    this.props.renameTable(oldTableName, newTableName);
    this.onRenameTableCancel();
  }

  onDeleteTableCancel = () => {
    this.setState({isTableDeleting: !this.state.isTableDeleting});
    this.props.onUnfreezedItem();
  }

  onDeleteTableSubmit = () => {
    let tableName = this.props.table.name;
    this.props.deleteTable(tableName);
    this.onDeleteTableCancel();
  }

  onShareTableCancel = () => {
    this.setState({isTableSharing: !this.state.isTableSharing});
    this.props.onUnfreezedItem();
  }

  dropdownToggle = () => {
    if (this.state.dropdownOpen) {
      this.props.onUnfreezedItem();
    } else {
      this.props.onFreezedItem();
    }
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  }

  render() {

    let table = this.props.table;
    let tableHref = siteRoot + 'workspace/' + this.props.workspaceID + '/dtable/' + table.name + '/';

    return (
      <div onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} className={ `table-item ${this.state.active ? 'tr-highlight' : ''}`}>
        <div className="table-icon"><span className="sf3-font sf3-font-table"></span></div>
        <div className="table-name">
          {this.state.isTableRenaming &&
            <Rename
              hasSuffix={true}
              name={table.name}
              onRenameConfirm={this.onRenameTableConfirm}
              onRenameCancel={this.onRenameTableCancel}
            />
          }
          {!this.state.isTableRenaming &&
            <a href={tableHref} target="_blank">{table.name}</a>
          }
        </div>
        <div className="table-dropdown-menu">
          {this.state.active &&
            <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down" className="table-item-more-operation">
              <DropdownToggle
                tag='i'
                className='fa fa-ellipsis-v cursor-pointer attr-action-icon table-dropdown-menu-icon'
                title={gettext('More Operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.dropdownOpen}
              >
              </DropdownToggle>
              <DropdownMenu className="drop-list" right={true}>
                <DropdownItem onClick={this.onRenameTableCancel}>{gettext('Rename')}</DropdownItem>
                <DropdownItem onClick={this.onDeleteTableCancel}>{gettext('Delete')}</DropdownItem>
                <DropdownItem onClick={this.onShareTableCancel}>{gettext('Share')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
          {this.state.isTableDeleting &&
            <DeleteTableDialog
              currentTable={table}
              deleteCancel={this.onDeleteTableCancel}
              handleSubmit={this.onDeleteTableSubmit}
            />
          }
          {this.state.isTableSharing &&
            <ShareTableDialog
              currentTable={table}
              ShareCancel={this.onShareTableCancel}
            />
          }
        </div>
      </div>
    );
  }
}

ListTableItem.propTypes = propTypes;

export default ListTableItem;

