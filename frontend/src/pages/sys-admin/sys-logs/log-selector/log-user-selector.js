import React, { Component } from 'react';
import { Input, Popover } from 'reactstrap';
import { uniqueId } from 'lodash-es';
import PropTypes from 'prop-types';
import Icon from '@/components/icon';
import OpIcon from '@/components/op-icon';
import toaster from '@/components/toast';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';

import './index.css';

const propTypes = {
  componentName: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  selectedItems: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  searchUsersFunc: PropTypes.func,
  searchGroupsFunc: PropTypes.func
};

class LogUserSelector extends Component {

  constructor(props) {
    super(props);
    this.state = {
      query: '',
      searchResults: [],
      isLoading: false
    };
    this.finalValue = '';
    this.selectorId = uniqueId('log-user-selector-');
  }

  onQueryChange = (e) => {
    const value = e.target.value;
    this.setState({ query: value });
    this.handleSearchUser(value);
  };

  clearQuery = (e) => {
    e.stopPropagation();
    this.setState({ query: '' }, () => this.searchInput.focus());
    this.handleSearchUser('');
  };

  handleSearchUser = (value) => {
    this.finalValue = value;
    if (!value.trim()) {
      this.setState({
        searchResults: [],
        isLoading: false
      });
      return;
    }

    this.setState({
      isLoading: true
    });

    setTimeout(() => {
      if (this.finalValue === value) {
        if (this.props.searchUsersFunc) {
          this.props.searchUsersFunc(value).then((res) => {
            if (this.finalValue !== value) return;
            const users = res.data.user_list || res.data.users || [];
            this.setState({
              searchResults: users,
              isLoading: false
            }, () => {
              if (this.props.searchGroupsFunc) {
                this.props.searchGroupsFunc(value).then((res) => {
                  if (this.finalValue !== value) return;
                  const groups = res.data.group_list || res.data.groups || [];
                  this.setState({
                    searchResults: [...users, ...groups]
                  });
                });
              }
            });
          }).catch((error) => {
            if (this.finalValue !== value) return;
            this.setState({
              isLoading: false
            });
            let errMessage = Utils.getErrorMsg(error);
            toaster.danger(errMessage);
          });
        }
        if (this.props.searchGroupsFunc && !this.props.searchUsersFunc) {
          this.props.searchGroupsFunc(value).then((res) => {
            if (this.finalValue !== value) return;
            const groups = res.data.group_list || res.data.groups || [];
            this.setState({
              searchResults: groups,
              isLoading: false
            });
          });
        }
      }
    }, 500);
  };

  toggleSelectItem = (e, item) => {
    e.stopPropagation();
    this.props.onSelect(item, false);
  };

  render() {
    const { query, isLoading, searchResults } = this.state;
    const { selectedItems, isOpen, onToggle } = this.props;
    const displayItems = query.trim() ? searchResults : this.props.items;

    return (
      <>
        <span id="log-user-selector-trigger">
          <span
            className="cur-activity-modifiers"
            onClick={onToggle}
            aria-label={gettext('Toggle user selector')}
            role="button"
            title={gettext('Toggle user selector')}
          >
            {selectedItems.length > 0 ? (
              <>
                <span>{(this.props.componentName + ':')}</span>
                <span className="d-inline-block ml-1">{selectedItems.map(item => item.name).join(', ')}</span>
              </>
            ) : this.props.componentName}
            <Icon symbol="down" className="ml-1 toggle-icon" />
          </span>
        </span>
        <Popover
          isOpen={isOpen}
          toggle={onToggle}
          target="log-user-selector-trigger"
          placement="bottom-start"
          hideArrow={true}
          fade={false}
          trigger="legacy"
          popperClassName="activity-user-selector-popover log-user-selector-popover"
          innerClassName="activity-user-selector-content"
        >
          <ul className="activity-selected-modifiers">
            {selectedItems.map((item, index) => {
              return (
                <li key={index} className="activity-selected-modifier">
                  <img src={item.avatar_url} className="avatar" alt="" />
                  <span className="activity-user-name" title={item.name}>{item.name}</span>
                  <OpIcon
                    id={`${this.selectorId}-remove-${index}`}
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
              placeholder={gettext('Find users')}
              value={query}
              onChange={this.onQueryChange}
            />
            {query && (
              <OpIcon
                id={`${this.selectorId}-clear`}
                symbol="close"
                className="activity-user-selector-clear"
                tooltip={gettext('Clear')}
                op={this.clearQuery}
              />
            )}
          </div>
          {isLoading ? (
            <div className="activity-user-loading">{gettext('Loading...')}</div>
          ) : displayItems.length === 0 ? (
            <div className="activity-user-selector-empty" role="status">
              {query.trim() ? gettext('User not found') : gettext('Enter characters to start searching')}
            </div>
          ) : (
            <ul className="activity-user-list">
              {displayItems.map((item, index) => {
                const isSelected = selectedItems.some(selected =>
                  (item.email && selected.email === item.email) ||
                  (item.id && selected.id === item.id)
                );
                return (
                  <li key={index}
                    className="activity-user-item d-flex justify-content-between align-items-center"
                    onClick={(e) => { this.toggleSelectItem(e, item); }}
                  >
                    <span className="avatar-name-wrapper">
                      <img src={item.avatar_url} className="avatar" alt="" />
                      <span className="activity-user-name" title={item.name}>{item.name}</span>
                    </span>
                    {isSelected && <Icon symbol="check" className="activity-user-selector-check" />}
                  </li>
                );
              })}
            </ul>
          )}
        </Popover>
      </>
    );
  }
}

LogUserSelector.propTypes = propTypes;

export default LogUserSelector;
