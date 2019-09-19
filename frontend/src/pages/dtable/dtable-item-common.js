import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import Rename from '../../components/rename';

const gettext = window.gettext;
const siteRoot = window.app.config.siteRoot;

const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  table: PropTypes.object.isRequired,
  renameTable: PropTypes.func.isRequired,
  onDeleteTableToggle: PropTypes.func.isRequired,
  onShareTableToggle: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
};

class DtableItemCommon extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isTableRenaming: false,
      dropdownOpen: false,
      active: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({active: true});
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({active: false});
    }
  }
  
  onRenameTableConfirm = (newTableName) => {
    let oldTableName = this.props.table.name;
    this.props.renameTable(oldTableName, newTableName);
    this.onRenameTableToggle();
  }
  
  onRenameTableToggle = () => {
    this.setState({isTableRenaming: !this.state.isTableRenaming});
    this.props.onUnfreezedItem();
  }

  onDeleteTableToggle = () => {
    this.props.onDeleteTableToggle(this.props.table);
  }

  onShareTableToggle = () => {
    this.props.onShareTableToggle(this.props.table);
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
    let tableHref = siteRoot + 'workspace/' + table.workspace_id + '/dtable/' + table.name + '/';

    return (
      <div onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} className={`table-item ${this.state.active ? 'tr-highlight' : ''}`}>
        <div className="table-icon"><span className="sf3-font sf3-font-table"></span></div>
        <div className="table-name">
          {this.state.isTableRenaming && (
            <Rename
              hasSuffix={true}
              name={table.name}
              onRenameConfirm={this.onRenameTableConfirm}
              onRenameCancel={this.onRenameTableToggle}
            />
          )}
          {!this.state.isTableRenaming && <a href={tableHref} target="_blank">{table.name}</a>}
        </div>
        <div className="table-dropdown-menu">
          {this.state.active && (
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
                <DropdownItem onClick={this.onRenameTableToggle}>{gettext('Rename')}</DropdownItem>
                <DropdownItem onClick={this.onDeleteTableToggle}>{gettext('Delete')}</DropdownItem>
                <DropdownItem onClick={this.onShareTableToggle}>{gettext('Share')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>
    );
  }
}

DtableItemCommon.propTypes = propTypes;

export default DtableItemCommon;

