import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { gettext } from '../../utils/constants';

import '../../css/files-activities.css';

const propTypes = {
  availableUsers: PropTypes.array.isRequired,
  currentSelectedUsers: PropTypes.array.isRequired,
  setTargetUsers: PropTypes.func.isRequired,
};

class UserSelector extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isPopoverOpen: false,
      availableUsers: props.availableUsers.map(item => {
        item.isSelected = false;
        return item;
      }),
      filteredAvailableUsers: props.availableUsers.map(item => {
        item.isSelected = false;
        return item;
      })
    };
  }

  togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen
    }, () => {
      if (!this.state.isPopoverOpen) {
        const { availableUsers } = this.state;
        const selectedUsers = availableUsers.filter(item => item.isSelected);
        this.props.setTargetUsers(selectedUsers);
      }
    });
  };

  searchUsers = (e) => {
    const { availableUsers } = this.state;
    const query = e.target.value.trim();
    const filteredAvailableUsers = availableUsers.filter(item => item.email.indexOf(query) != -1);
    this.setState({
      filteredAvailableUsers: filteredAvailableUsers
    });
  };

  toggleSelectItem = (targetItem) => {
    const { availableUsers } = this.state;
    const handleItem = (item) => {
      if (item.email == targetItem.email) {
        item.isSelected = !targetItem.isSelected;
      }
      return item;
    };

    this.setState({
      availableUsers: availableUsers.map(handleItem),
    });
  };

  render() {
    const { isPopoverOpen, availableUsers, filteredAvailableUsers } = this.state;
    const { currentSelectedUsers } = this.props;
    const selectedUsers = availableUsers.filter(item => item.isSelected);
    return (
      <div className="mt-4 position-relative">
        <span className="d-inline-block p-2 activity-modifier rounded" onClick={this.togglePopover}>
          {gettext('Modified by:')}
          {currentSelectedUsers.length > 0 && (
            <span className="d-inline-block ml-1">{currentSelectedUsers.map(item => item.name).join(', ')}</span>
          )}
          <i className="fas fa-caret-down ml-2 toggle-icon"></i>
        </span>
        {isPopoverOpen && (
          <div className="position-absolute activity-modifier-selector-container rounded shadow">
            <ul className="activity-selected-modifiers px-3 py-2 list-unstyled d-flex">
              {selectedUsers.map((item, index) => {
                return (
                  <li key={index} className="activity-selected-modifier">
                    <img src={item.avatar_url} className="select-module select-module-icon avatar" alt="" />
                    <span className='select-module select-module-name'>{item.name}</span>
                    <i className="sf2-icon-close unselect-activity-user ml-2" onClick={this.toggleSelectItem.bind(this, item)}></i>
                  </li>
                );
              })}
            </ul>
            <div className="p-3">
              <Input
                type="text"
                placeholder={gettext('Search users...')}
                className="mb-1"
                onKeyDown={this.searchUsers}
              />
              <ul className="activity-user-list list-unstyled">
                {filteredAvailableUsers.map((item, index) => {
                  return (
                    <li key={index} className="activity-user-item h-6 p-1 rounded d-flex justify-content-between align-items-center" onClick={this.toggleSelectItem.bind(this, item)}>
                      <div>
                        <img src={item.avatar_url} className="select-module select-module-icon avatar" alt="" />
                        <span className='select-module select-module-name'>{item.name}</span>
                      </div>
                      {item.isSelected && <i className="sf2-icon-tick text-gray"></i>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }
}

UserSelector.propTypes = propTypes;

export default UserSelector;
