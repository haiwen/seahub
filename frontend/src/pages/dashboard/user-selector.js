import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { gettext } from '../../utils/constants';

import '../../css/files-activities.css';

const propTypes = {
  availableUsers: PropTypes.array.isRequired,
  currentSelectedUsers: PropTypes.array.isRequired,
  setTargetUsers: PropTypes.func.isRequired,
  toggleSelectUser: PropTypes.func.isRequired
};

class UserSelector extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isPopoverOpen: false,
      query: ''
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
  };

  togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen
    }, () => {
      if (!this.state.isPopoverOpen) {
        const { availableUsers } = this.props;
        const selectedUsers = availableUsers.filter(item => item.isSelected);
        this.props.setTargetUsers(selectedUsers);
      }
    });
  };

  onToggleClick = (e) => {
    e.stopPropagation();
    this.togglePopover();
  };

  onQueryChange = (e) => {
    this.setState({
      query: e.target.value
    });
  };

  toggleSelectItem = (e, targetItem) => {
    e.stopPropagation();
    this.props.toggleSelectUser(targetItem);
  };

  render() {
    const { isPopoverOpen, query } = this.state;
    const { currentSelectedUsers, availableUsers } = this.props;
    const selectedUsers = availableUsers.filter(item => item.isSelected);
    const filteredAvailableUsers = query.trim() ? availableUsers.filter(item => item.contact_email.indexOf(query.trim()) != -1 || item.name.indexOf(query.trim()) != -1 || item.login_id.indexOf(query.trim()) != -1) : availableUsers;
    return (
      <div className="mt-4 position-relative">
        <span className="cur-activity-modifiers d-inline-block p-2 rounded" onClick={this.onToggleClick}>
          {currentSelectedUsers.length > 0 ? (
            <>
              <span>{gettext('Modified by:')}</span>
              <span className="d-inline-block ml-1">{currentSelectedUsers.map(item => item.name).join(', ')}</span>
            </>
          ) : gettext('Modified by')}
          <i className="sf3-font sf3-font-down ml-2 toggle-icon"></i>
        </span>
        {isPopoverOpen && (
          <div className="position-absolute activity-modifier-selector-container rounded shadow" ref={ref => this.userSelector = ref}>
            <ul className="activity-selected-modifiers px-3 py-1 list-unstyled">
              {selectedUsers.map((item, index) => {
                return (
                  <li key={index} className="activity-selected-modifier">
                    <img src={item.avatar_url} className="avatar w-5 h-5" alt="" />
                    <span className="activity-user-name ml-2">{item.name}</span>
                    <i className="sf2-icon-close unselect-activity-user ml-2" onClick={(e) => {this.toggleSelectItem(e, item);}}></i>
                  </li>
                );
              })}
            </ul>
            <div className="px-3 pt-3">
              <Input
                type="text"
                placeholder={gettext('Find modifiers')}
                value={query}
                onChange={this.onQueryChange}
              />
            </div>
            <ul className="activity-user-list list-unstyled p-3 o-auto">
              {filteredAvailableUsers.map((item, index) => {
                return (
                  <li key={index} className="activity-user-item h-6 p-1 rounded d-flex justify-content-between align-items-center" onClick={(e) => {this.toggleSelectItem(e, item);}}>
                    <div>
                      <img src={item.avatar_url} className="avatar w-5 h-5" alt="" />
                      <span className="activity-user-name ml-2">{item.name}</span>
                    </div>
                    {item.isSelected && <i className="sf2-icon-tick text-gray font-weight-bold"></i>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }
}

UserSelector.propTypes = propTypes;

export default UserSelector;
