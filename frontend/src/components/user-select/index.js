import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { seafileAPI } from '@/api/seafile-api';
import ClickOutside from '@/components/click-outside';
import UserSelectPopover from '@/components/popover/user-select-popover';
import SearchInput from '@/components/search-input';
import SelectDropdownIndicator from '@/components/select-dropdown-indicator';
import toaster from '@/components/toast';
import UserItem from '@/components/user-item';
import KeyCodes from '@/constants/keyCodes';
import { gettext, enableShowContactEmailWhenSearchUser, enableShowLoginIDWhenSearchUser } from '@/utils/constants';
import { Utils } from '@/utils/utils';

import './index.css';

let userSelectId = 0;

const propTypes = {
  placeholder: PropTypes.string,
  searchPlaceholder: PropTypes.string,
  onSelectChange: PropTypes.func.isRequired,
  isMulti: PropTypes.bool,
  className: PropTypes.string,
  selectedUsers: PropTypes.array,
};

class UserSelect extends React.Component {

  constructor(props) {
    super(props);
    this.triggerId = `user-select-${++userSelectId}`;
    this.state = {
      maxItemNum: 0,
      itemHeight: 0,
      searchedUsers: [],
      searchValue: '',
      highlightIndex: -1,
      popoverWidth: 385,
      isPopoverOpen: false,
    };
  }

  onValueChanged = (newSearchValue) => {
    this.setState({
      searchValue: newSearchValue
    });
    const searchValue = newSearchValue.trim();
    if (searchValue.length === 0) {
      this.setState({
        searchedUsers: [],
        highlightIndex: -1,
      });
    } else {
      seafileAPI.searchUsers(newSearchValue.trim()).then((res) => {
        this.setState({
          searchedUsers: res.data.users,
          highlightIndex: -1,
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  componentDidMount() {
    if (this.selectedUserItemContainer) {
      this.setState({
        popoverWidth: this.selectedUserItemContainer.offsetWidth
      });
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.selectedUserItemContainer) return;
        const popoverWidth = this.selectedUserItemContainer.offsetWidth;
        if (popoverWidth !== this.state.popoverWidth) {
          this.setState({ popoverWidth }, this.updatePopoverPosition);
          return;
        }
        this.updatePopoverPosition();
      });
      this.resizeObserver.observe(this.selectedUserItemContainer);
    }
    document.addEventListener('keydown', this.onHotKey, true);
  }

  componentDidUpdate(prevProps) {
    this.updateListMetrics();
    if (
      this.state.isPopoverOpen &&
      prevProps.selectedUsers !== this.props.selectedUsers
    ) {
      this.updatePopoverPosition();
    }
  }

  updateListMetrics = () => {
    if (this.container && this.userItem) {
      const maxItemNum = this.getMaxItemNum();
      const itemHeight = parseInt(getComputedStyle(this.userItem).height);
      if (Number.isFinite(maxItemNum) && Number.isFinite(itemHeight) && (maxItemNum !== this.state.maxItemNum || itemHeight !== this.state.itemHeight)) {
        this.setState({ maxItemNum, itemHeight });
      }
    }
  };

  setListRef = (ref) => {
    this.container = ref;
    this.updateListMetrics();
  };

  setOptionRef = (ref, index) => {
    if (index !== 0) return;
    this.userItem = ref;
    this.updateListMetrics();
  };

  componentWillUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    document.removeEventListener('keydown', this.onHotKey, true);
  }

  onClickOutside = (e) => {
    if (!this.selectedUserItemContainer.contains(e.target) && this.state.isPopoverOpen) {
      this.setState({
        isPopoverOpen: false,
        searchedUsers: [],
        searchValue: '',
        highlightIndex: -1,
      });
    }
  };

  getMaxItemNum = () => {
    let userContainerStyle = getComputedStyle(this.container, null);
    let userItemStyle = getComputedStyle(this.userItem, null);
    let maxContainerItemNum = Math.floor(parseInt(userContainerStyle.maxHeight) / parseInt(userItemStyle.height));
    return maxContainerItemNum - 1;
  };

  onHotKey = (e) => {
    if (!this.state.isPopoverOpen || e.isComposing || e.keyCode === 229) return;
    if (!this.selectedUserItemContainer.contains(e.target) && !(this.panel && this.panel.contains(e.target))) return;
    // Buttons and focusable options retain their own Enter/Space activation.
    if (e.keyCode === KeyCodes.Enter && e.target.tagName !== 'INPUT') return;
    if (e.keyCode === KeyCodes.Enter) {
      this.onEnter(e);
    } else if (e.keyCode === KeyCodes.UpArrow) {
      this.onUpArrow(e);
    } else if (e.keyCode === KeyCodes.DownArrow) {
      this.onDownArrow(e);
    } else if (e.keyCode === KeyCodes.Escape) {
      this.onEsc(e);
    }
  };

  onEnter = (e) => {
    e.preventDefault();
    let user;
    if (this.state.searchedUsers.length === 1) {
      user = this.state.searchedUsers[0];
    } else if (this.state.highlightIndex > -1) {
      user = this.state.searchedUsers[this.state.highlightIndex];
    }
    if (user) {
      this.onUserClick(user);
    }
  };

  onUpArrow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    let { highlightIndex, maxItemNum, itemHeight } = this.state;
    if (highlightIndex > 0) {
      this.setState({ highlightIndex: highlightIndex - 1 }, () => {
        if (this.container && highlightIndex < this.state.searchedUsers.length - maxItemNum) {
          this.container.scrollTop -= itemHeight;
        }
      });
    } else {
      this.setState({ highlightIndex: this.state.searchedUsers.length - 1 }, () => {
        if (this.container) {
          this.container.scrollTop = this.container.scrollHeight;
        }
      });
    }
  };

  onDownArrow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    let { highlightIndex, maxItemNum, itemHeight } = this.state;
    if (highlightIndex < this.state.searchedUsers.length - 1) {
      this.setState({ highlightIndex: highlightIndex + 1 }, () => {
        if (this.container && highlightIndex >= maxItemNum) {
          this.container.scrollTop += itemHeight;
        }
      });
    } else {
      this.setState({ highlightIndex: 0 }, () => {
        if (this.container) {
          this.container.scrollTop = 0;
        }
      });
    }
  };

  onEsc = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      isPopoverOpen: false,
      searchedUsers: [],
      searchValue: '',
      highlightIndex: -1
    });
  };

  onUserClick = (user) => {
    const { isMulti = true } = this.props;
    let selectedUsers = (this.props.selectedUsers || []).slice(0);
    const index = selectedUsers.findIndex(item => item.email === user.email);
    if (isMulti) {
      if (index > -1) {
        selectedUsers.splice(index, 1);
      } else {
        selectedUsers.push(user);
      }
    } else {
      if (index > -1) {
        selectedUsers = [];
      } else {
        selectedUsers = [user];
      }
    }
    this.props.onSelectChange(selectedUsers);
  };

  onKeyDown = (e) => {
    if (e.keyCode === KeyCodes.LeftArrow || e.keyCode === KeyCodes.RightArrow) {
      e.stopPropagation();
    }
  };

  onDeleteSelectedCollaborator = (user) => {
    const { selectedUsers = [] } = this.props;
    const newSelectedCollaborator = selectedUsers.filter(item => item.email !== user.email);
    this.props.onSelectChange(newSelectedCollaborator);
  };

  updatePopoverPosition = () => {
    if (!this.state.isPopoverOpen || !this.updatePopover) return;
    requestAnimationFrame(() => {
      if (this.updatePopover) {
        this.updatePopover();
      }
    });
  };

  onTogglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
      highlightIndex: -1,
      searchedUsers: [],
      searchValue: ''
    });
  };

  setPopoverUpdate = (update) => {
    this.updatePopover = update;
  };

  toOption = (user) => ({
    key: `user:${user.email}`,
    name: user.name,
    avatarUrl: user.avatar_url,
    secondaryText: [
      enableShowContactEmailWhenSearchUser ? `(${user.contact_email})` : null,
      enableShowLoginIDWhenSearchUser ? `(${user.login_id})` : null,
    ].filter(Boolean).join(' ') || null,
    data: user,
  });

  renderSearchInput = ({ className, renderClearButton }) => (
    <SearchInput
      autoFocus={true}
      className={className}
      placeholder={this.props.searchPlaceholder || gettext('Search users')}
      value={this.state.searchValue}
      onChange={this.onValueChanged}
      onKeyDown={this.onKeyDown}
      isClearable={true}
      clearValue={() => this.onValueChanged('')}
      components={{ ClearIndicator: ({ clearValue }) => renderClearButton(clearValue) }}
    />
  );

  render() {
    const { searchValue, highlightIndex, searchedUsers } = this.state;
    const { className = '', selectedUsers = [] } = this.props;
    return (
      <ClickOutside onClickOutside={this.onClickOutside}>
        <>
          <div
            className={classnames('user-select-trigger sf-select justify-content-start', className, {
              'focus': this.state.isPopoverOpen,
              'has-selected-users': selectedUsers.length > 0,
            })}
            id={this.triggerId}
            tabIndex={0}
            role="button"
            aria-haspopup="listbox"
            aria-expanded={this.state.isPopoverOpen}
            onClick={this.onTogglePopover}
            onKeyDown={Utils.onKeyDown}
            ref={ref => this.selectedUserItemContainer = ref}
          >
            <div className="user-select-trigger__content">
              {selectedUsers.map((user, index) => {
                return (
                  <UserItem
                    key={index}
                    idx={index}
                    removeButtonId={`${this.triggerId}-trigger-remove-${index}`}
                    user={user}
                    enableDeleteUser={true}
                    onDeleteUser={this.onDeleteSelectedCollaborator}
                  />
                );
              })}
              {selectedUsers.length === 0 && (
                <div className="user-select-placeholder">
                  {this.props.placeholder || gettext('Select users')}
                </div>
              )}
            </div>
            <SelectDropdownIndicator />
          </div>
          <UserSelectPopover
            isOpen={this.state.isPopoverOpen}
            target={this.triggerId}
            onToggle={this.onTogglePopover}
            trigger="manual"
            width={this.state.popoverWidth}
            options={searchedUsers.map(this.toOption)}
            selectedOptions={selectedUsers.map(this.toOption)}
            query={searchValue}
            highlightIndex={highlightIndex}
            emptyText={searchValue ? gettext('No results') : gettext('Enter characters to start searching')}
            renderSearchInput={this.renderSearchInput}
            onSelect={option => this.onUserClick(option.data)}
            onRemove={option => this.onDeleteSelectedCollaborator(option.data)}
            panelRef={ref => this.panel = ref}
            listRef={this.setListRef}
            optionRef={this.setOptionRef}
            onPopoverUpdate={this.setPopoverUpdate}
          />
        </>
      </ClickOutside>
    );
  }
}

UserSelect.propTypes = propTypes;

export default UserSelect;
