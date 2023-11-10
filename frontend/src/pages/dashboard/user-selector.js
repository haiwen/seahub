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
      query: '',
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

  componentDidMount() {
    document.addEventListener('click', this.handleOutsideClick);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = (e) => {
    const { isPopoverOpen } = this.state;
    if (isPopoverOpen && !this.userSelector.contains(e.target)) {
      this.togglePopover();
    }
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

  onToggleClick = (e) => {
    e.stopPropagation();
    this.togglePopover();
  }

  onQueryChange = (e) => {
    const { availableUsers } = this.state;
    const query = e.target.value.trim();
    const filteredAvailableUsers = availableUsers.filter(item => item.email.indexOf(query) != -1);
    this.setState({
      query: e.target.value,
      filteredAvailableUsers: filteredAvailableUsers
    });
  }

  toggleSelectItem = (e, targetItem) => {
    e.stopPropagation();
    const { availableUsers } = this.state;
    const handleItem = (item) => {
      if (item.email == targetItem.email) {
        item.isSelected = !targetItem.isSelected;
      }
      return item;
    };

    this.setState({
      availableUsers: availableUsers.map(handleItem)
    });
  };

  render() {
    const { isPopoverOpen, query, availableUsers, filteredAvailableUsers } = this.state;
    const { currentSelectedUsers } = this.props;
    const selectedUsers = availableUsers.filter(item => item.isSelected);
    return (
      <div className="mt-4 position-relative">
        <span className="cur-activity-modifiers d-inline-block p-2 rounded" onClick={this.onToggleClick}>
          {gettext('Modified by:')}
          {currentSelectedUsers.length > 0 && (
            <span className="d-inline-block ml-1">{currentSelectedUsers.map(item => item.name).join(', ')}</span>
          )}
          <i className="fas fa-caret-down ml-2 toggle-icon"></i>
        </span>
        {isPopoverOpen && (
          <div className="position-absolute activity-modifier-selector-container rounded shadow" ref={ref => this.userSelector = ref}>
            <ul className="activity-selected-modifiers px-3 py-2 list-unstyled">
              {selectedUsers.map((item, index) => {
                return (
                  <li key={index} className="activity-selected-modifier">
                    <img src={item.avatar_url} className="avatar w-5 h-5" alt="" />
                    <span className="ml-2">{item.name}</span>
                    <i className="sf2-icon-close unselect-activity-user ml-2" onClick={(e) => {this.toggleSelectItem(e, item);}}></i>
                  </li>
                );
              })}
            </ul>
            <div className="p-3">
              <Input
                type="text"
                className="mb-1"
                placeholder={gettext('Search users...')}
                value={query}
                onChange={this.onQueryChange}
              />
              <ul className="activity-user-list list-unstyled">
                {filteredAvailableUsers.map((item, index) => {
                  return (
                    <li key={index} className="activity-user-item h-6 p-1 rounded d-flex justify-content-between align-items-center" onClick={(e) => {this.toggleSelectItem(e, item);}}>
                      <div>
                        <img src={item.avatar_url} className="avatar w-5 h-5" alt="" />
                        <span className="ml-2">{item.name}</span>
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
