import React, { Component } from 'react';
import { Input, Popover } from 'reactstrap';
import PropTypes from 'prop-types';
import Icon from '@/components/icon';
import OpElement from '@/components/op-element';
import OpIcon from '@/components/op-icon';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';

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

  onQueryChange = (e) => {
    this.setState({
      query: e.target.value
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

  render() {
    const { isPopoverOpen, query } = this.state;
    const { currentSelectedUsers, availableUsers } = this.props;
    const selectedUsers = availableUsers.filter(item => item.isSelected);
    const filteredAvailableUsers = query.trim() ? availableUsers.filter(item => item.contact_email.indexOf(query.trim()) != -1 || item.name.indexOf(query.trim()) != -1 || item.login_id.indexOf(query.trim()) != -1) : availableUsers;
    return (
      <>
        <span id="activity-user-selector-trigger" className="files-activities-user-selector d-inline-flex mw-100">
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
        <Popover
          isOpen={isPopoverOpen}
          toggle={this.togglePopover}
          target="activity-user-selector-trigger"
          placement="bottom-start"
          hideArrow={true}
          fade={false}
          trigger="legacy"
          popperClassName="files-activities-user-selector-popover"
          innerClassName="activity-user-selector-content"
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, 8],
              }
            }
          ]}
        >
          <ul className="activity-selected-modifiers">
            {selectedUsers.map((item, index) => {
              return (
                <li key={item.email} className="activity-selected-modifier">
                  <img src={item.avatar_url} className="avatar" alt="" />
                  <span className="activity-user-name" title={item.name}>{item.name}</span>
                  <OpIcon
                    id={`activity-user-selector-remove-${index}`}
                    symbol="close"
                    className="unselect-activity-user"
                    tooltip={gettext('Remove')}
                    op={(e) => { this.toggleSelectItem(e, item); }}
                  />
                </li>
              );
            })}
          </ul>
          <div className="activity-user-selector-search">
            <Input
              type="text"
              className="activity-user-selector-input"
              innerRef={ref => this.searchInput = ref}
              placeholder={gettext('Find modifiers')}
              aria-label={gettext('Find modifiers')}
              value={query}
              onChange={this.onQueryChange}
            />
            {query && (
              <OpIcon
                id="activity-user-selector-clear"
                symbol="close"
                className="activity-user-selector-clear"
                title={gettext('Clear')}
                tooltip={gettext('Clear')}
                op={this.clearQuery}
              />
            )}
          </div>
          {filteredAvailableUsers.length > 0 &&
            <ul className="activity-user-list">
              {filteredAvailableUsers.map((item) => {
                return (
                  <li
                    key={item.email}
                    className="activity-user-item d-flex justify-content-between align-items-center"
                    onClick={(e) => { this.toggleSelectItem(e, item); }}
                    tabIndex="0"
                    onKeyDown={Utils.onKeyDown}
                    role="button"
                    aria-pressed={item.isSelected}
                    aria-label={item.name}
                  >
                    <div>
                      <img src={item.avatar_url} className="avatar" alt="" />
                      <span className="activity-user-name" title={item.name}>{item.name}</span>
                    </div>
                    {item.isSelected && <Icon symbol="check" className="activity-user-selector-check" />}
                  </li>
                );
              })}
            </ul>}
          {filteredAvailableUsers.length === 0 && (
            <div className="activity-user-selector-empty" role="status">{gettext('No collaborators available')}</div>
          )}
        </Popover>
      </>
    );
  }
}

UserSelector.propTypes = propTypes;

export default UserSelector;
