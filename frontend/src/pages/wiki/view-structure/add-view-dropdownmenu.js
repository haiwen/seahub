import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownItem, DropdownToggle } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import Icon from '../../../components/icon';

class AddViewDropdownMenu extends Component {

  toggle = event => {
    this.onStopPropagation(event);
    this.props.onToggleAddViewDropdown();
  };

  onToggleAddView = event => {
    this.onStopPropagation(event);
    this.props.onToggleAddView();
  };

  onToggleAddFolder = event => {
    this.onStopPropagation(event);
    this.props.onToggleAddFolder();
  };

  onStopPropagation = event => {
    event && event.nativeEvent && event.nativeEvent.stopImmediatePropagation();
  };

  render() {
    return (
      <Dropdown isOpen toggle={this.toggle}>
        <DropdownToggle caret></DropdownToggle>
        <DropdownMenu container="body" className='dtable-dropdown-menu large add-view-dropdown-menu' style={{ zIndex: 1061 }}>
          <DropdownItem onClick={this.onToggleAddView}>
            <Icon symbol={'main-view'}/>
            <span className='item-text'>{gettext('Add page')}</span>
          </DropdownItem>
          <DropdownItem onClick={this.onToggleAddFolder}>
            <Icon symbol={'folders'}/>
            <span className='item-text'>{gettext('Add folder')}</span>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }
}

AddViewDropdownMenu.propTypes = {
  onToggleAddViewDropdown: PropTypes.func,
  onToggleAddView: PropTypes.func,
  onToggleAddFolder: PropTypes.func,
};

export default AddViewDropdownMenu;
