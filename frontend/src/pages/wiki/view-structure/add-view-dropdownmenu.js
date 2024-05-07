import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownItem, DropdownToggle } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import Icon from '../../../components/icon';

class AddViewDropdownMenu extends Component {

  toggle = event => {
    this.onStopPropagation(event);
    this.props.toggleDropdown();
  };

  addExistingFile = event => {
    this.onStopPropagation(event);
    this.props.onToggleAddView(null, 'existing-file');
  };

  addPage = event => {
    this.onStopPropagation(event);
    this.props.onToggleAddView(null, 'new-page');
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
        <DropdownMenu container="body" className='dtable-dropdown-menu large mt-0'>
          <DropdownItem onClick={this.addPage}>
            <Icon symbol={'main-view'}/>
            <span className='item-text'>{gettext('Add page')}</span>
          </DropdownItem>
          <DropdownItem onClick={this.addExistingFile}>
            <Icon symbol={'file'}/>
            <span className='item-text'>{gettext('Add existing file')}</span>
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
  toggleDropdown: PropTypes.func,
  onToggleAddView: PropTypes.func,
  onToggleAddFolder: PropTypes.func,
};

export default AddViewDropdownMenu;
