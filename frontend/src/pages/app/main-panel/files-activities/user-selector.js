import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Icon from '@/components/icon';
import OpElement from '@/components/op-element';
import UserSelectPopover from '@/components/popover/user-select-popover';
import { gettext } from '@/utils/constants';

let userSelectorId = 0;

const propTypes = {
  availableUsers: PropTypes.array.isRequired,
  currentSelectedUsers: PropTypes.array.isRequired,
  setTargetUsers: PropTypes.func.isRequired,
  toggleSelectUser: PropTypes.func.isRequired
};

class UserSelector extends Component {

  constructor(props) {
    super(props);
    this.triggerId = `activity-user-selector-trigger-${++userSelectorId}`;
    this.state = {
      isPopoverOpen: false,
      query: ''
    };
  }

  togglePopover = () => {
    const { isPopoverOpen } = this.state;
    if (isPopoverOpen) {
      const { availableUsers } = this.props;
      const selectedUsers = availableUsers.filter(item => item.isSelected);
      this.props.setTargetUsers(selectedUsers);
    }
    this.setState({
      isPopoverOpen: !isPopoverOpen,
      query: '',
    });
  };

  onToggleClick = () => {
    this.togglePopover();
  };

  onQueryChange = (value) => {
    this.setState({
      query: value
    });
  };

  clearQuery = (e) => {
    e.stopPropagation();
    this.setState({ query: '' }, () => this.searchInput.focus());
  };

  toggleSelectItem = (e, targetItem) => {
    e.stopPropagation();
    this.props.toggleSelectUser(targetItem);
  };

  toOption = (user) => ({
    key: `user:${user.email}`,
    name: user.name,
    avatarUrl: user.avatar_url,
    secondaryText: null,
    data: user,
  });

  onSelectOption = (option, event) => {
    this.toggleSelectItem(event, option.data);
  };

  render() {
    const { isPopoverOpen, query } = this.state;
    const { currentSelectedUsers, availableUsers } = this.props;
    const selectedUsers = availableUsers.filter(item => item.isSelected);
    const filteredAvailableUsers = query.trim() ? availableUsers.filter(item => item.contact_email.indexOf(query.trim()) != -1 || item.name.indexOf(query.trim()) != -1 || item.login_id.indexOf(query.trim()) != -1) : availableUsers;
    return (
      <>
        <span id={this.triggerId} className="files-activities-user-selector d-inline-flex mw-100">
          <OpElement
            className="cur-activity-modifiers d-inline-flex align-items-center rounded overflow-hidden"
            title={gettext('Toggle user selector')}
            op={this.onToggleClick}
          >
            {currentSelectedUsers.length > 0 ? (
              <>
                <span className="flex-shrink-0">{gettext('Modified by:')}</span>
                <span className="d-inline-block ml-1 text-truncate" title={currentSelectedUsers.map(item => item.name).join(', ')}>{currentSelectedUsers.map(item => item.name).join(', ')}</span>
              </>
            ) : gettext('Modified by')}
            <Icon symbol="down" className="w-3 h-3 ml-2 toggle-icon flex-shrink-0" />
          </OpElement>
        </span>
        <UserSelectPopover
          isOpen={isPopoverOpen}
          onToggle={this.togglePopover}
          target={this.triggerId}
          trigger="legacy"
          offset={[0, 8]}
          options={filteredAvailableUsers.map(this.toOption)}
          selectedOptions={selectedUsers.map(this.toOption)}
          query={query}
          onQueryChange={this.onQueryChange}
          onClear={this.clearQuery}
          inputRef={ref => this.searchInput = ref}
          searchPlaceholder={gettext('Find modifiers')}
          emptyText={gettext('No collaborators available')}
          onSelect={this.onSelectOption}
          onRemove={this.onSelectOption}
        />
      </>
    );
  }
}

UserSelector.propTypes = propTypes;

export default UserSelector;
