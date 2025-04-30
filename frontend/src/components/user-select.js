import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Popover } from 'reactstrap';
import { seafileAPI } from '../utils/seafile-api';
import { gettext } from '../utils/constants';
import { Utils } from '../utils/utils';
import toaster from './toast';
import KeyCodes from '../constants/keyCodes';
import SearchInput from './search-input';
import UserItem from '../components/user-item';
import ClickOutside from './click-outside';

import '../css/user-select.css';

const propTypes = {
  placeholder: PropTypes.string.isRequired,
  onSelectChange: PropTypes.func.isRequired,
  isMulti: PropTypes.bool,
  className: PropTypes.string,
};

class UserSelect extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      maxItemNum: 0,
      itemHeight: 0,
      searchedUsers: [],
      searchValue: '',
      highlightIndex: -1,
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
          highlightIndex: res.data.users.length > 0 ? 0 : -1,
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  componentDidMount() {
    if (this.ref) {
      const { bottom } = this.ref.getBoundingClientRect();
      if (bottom > window.innerHeight) {
        this.ref.style.top = `${window.innerHeight - bottom}px`;
      }
    }
    if (this.container && this.userItem) {
      this.setState({
        maxItemNum: this.getMaxItemNum(),
        itemHeight: parseInt(getComputedStyle(this.userItem, null).height)
      });
    }
    document.addEventListener('keydown', this.onHotKey, true);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onHotKey, true);
  }

  onClickOutside = (e) => {
    if (e.target.id !== 'user-select' && this.state.isPopoverOpen) {
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
        if (highlightIndex < this.state.searchedUsers.length - maxItemNum) {
          this.container.scrollTop -= itemHeight;
        }
      });
    } else {
      this.setState({ highlightIndex: this.state.searchedUsers.length - 1 }, () => {
        this.container.scrollTop = this.container.scrollHeight;
      });
    }
  };

  onDownArrow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    let { highlightIndex, maxItemNum, itemHeight } = this.state;
    if (highlightIndex < this.state.searchedUsers.length - 1) {
      this.setState({ highlightIndex: highlightIndex + 1 }, () => {
        if (highlightIndex >= maxItemNum) {
          this.container.scrollTop += itemHeight;
        }
      });
    } else {
      this.setState({ highlightIndex: 0 }, () => {
        this.container.scrollTop = 0;
      });
    }
  };

  onEsc = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isPopoverOpen: false });
  };

  onUserClick = (user) => {
    const { isMulti = true } = this.props;
    let selectedUsers = this.props.selectedUsers.slice(0);
    if (isMulti) {
      const index = selectedUsers.findIndex(item => item.email === user.email);
      if (index > -1) {
        selectedUsers.splice(index, 1);
      } else {
        selectedUsers.push(user);
      }
    } else {
      selectedUsers = [user];
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

  onTogglePopover = () => {
    this.setState({ isPopoverOpen: !this.state.isPopoverOpen });
    if (!this.state.isPopoverOpen) {
      this.onValueChanged(this.state.searchValue);
    }
  };

  render() {
    const { searchValue, highlightIndex, searchedUsers } = this.state;
    const { className = '', selectedUsers = [] } = this.props;
    return (
      <ClickOutside onClickOutside={this.onClickOutside}>
        <>
          <div className={classnames('selected-user-item-container form-control d-flex align-items-center', className, { 'focus': this.state.isPopoverOpen })} id="user-select" onClick={this.onTogglePopover}>
            {selectedUsers.map((user, index) => {
              return (
                <UserItem
                  key={index}
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
          <Popover
            placement="bottom-start"
            isOpen={this.state.isPopoverOpen}
            target={'user-select'}
            hideArrow={true}
            fade={false}
            className="user-select-popover"
          >
            <div className="user-select-container" ref={ref => this.ref = ref} onMouseDown={e => e.stopPropagation()}>
              <div className="user-search-container">
                <SearchInput
                  autoFocus={true}
                  placeholder={this.props.placeholder || gettext('Search users')}
                  value={searchValue}
                  onChange={this.onValueChanged}
                  onKeyDown={this.onKeyDown}
                />
              </div>
              <div className="user-list-container" ref={ref => this.container = ref}>
                {searchedUsers.length > 0 && (
                  searchedUsers.map((user, index) => {
                    return (
                      <div
                        key={user.email}
                        className={classnames('user-item-container', { 'user-item-container-highlight': index === highlightIndex })}
                        ref={ref => this.userItem = ref}
                        onClick={this.onUserClick.bind(this, user)}
                      >
                        <UserItem user={user} enableDeleteUser={false} />
                      </div>
                    );
                  })
                )}
                {searchedUsers.length === 0 &&
                  <div className="no-search-result">
                    {searchValue ? gettext('User not found') : gettext('Enter characters to start searching')}
                  </div>
                }
              </div>
            </div>
          </Popover>
        </>
      </ClickOutside>
    );
  }
}

UserSelect.propTypes = propTypes;

export default UserSelect;
