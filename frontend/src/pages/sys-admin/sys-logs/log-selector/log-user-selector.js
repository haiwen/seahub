import React, { Component } from 'react';
import { uniqueId } from 'lodash-es';
import PropTypes from 'prop-types';
import Icon from '@/components/icon';
import UserSelectPopover from '@/components/popover/user-select-popover';
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
    this.searchRequestId = 0;
    this.selectorId = uniqueId('log-user-selector-');
  }

  componentDidUpdate(prevProps) {
    if (prevProps.isOpen && !this.props.isOpen) {
      this.finalValue = '';
      this.searchRequestId++;
      this.setState({
        query: '',
        searchResults: [],
        isLoading: false
      });
    }
  }

  componentWillUnmount() {
    this.searchRequestId++;
  }

  onQueryChange = (value) => {
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
    const searchRequestId = ++this.searchRequestId;
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
      if (this.finalValue === value && this.searchRequestId === searchRequestId) {
        if (this.props.searchUsersFunc) {
          this.props.searchUsersFunc(value).then((res) => {
            if (this.finalValue !== value || this.searchRequestId !== searchRequestId) return;
            const users = res.data.user_list || res.data.users || [];
            this.setState({
              searchResults: users,
              isLoading: false
            }, () => {
              if (this.finalValue !== value || this.searchRequestId !== searchRequestId) return;
              if (this.props.searchGroupsFunc) {
                this.props.searchGroupsFunc(value).then((res) => {
                  if (this.finalValue !== value || this.searchRequestId !== searchRequestId) return;
                  const groups = res.data.group_list || res.data.groups || [];
                  this.setState({
                    searchResults: [...users, ...groups]
                  });
                });
              }
            });
          }).catch((error) => {
            if (this.finalValue !== value || this.searchRequestId !== searchRequestId) return;
            this.setState({
              isLoading: false
            });
            let errMessage = Utils.getErrorMsg(error);
            toaster.danger(errMessage);
          });
        }
        if (this.props.searchGroupsFunc && !this.props.searchUsersFunc) {
          this.props.searchGroupsFunc(value).then((res) => {
            if (this.finalValue !== value || this.searchRequestId !== searchRequestId) return;
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

  toOption = (item) => ({
    key: item.email ? `user:${item.email}` : `group:${item.id}`,
    name: item.name,
    avatarUrl: item.avatar_url,
    secondaryText: null,
    data: item,
  });

  onSelectOption = (option, event) => {
    this.toggleSelectItem(event, option.data);
  };

  render() {
    const { query, isLoading, searchResults } = this.state;
    const { selectedItems, isOpen, onToggle } = this.props;
    const displayItems = query.trim() ? searchResults : this.props.items;

    return (
      <>
        <span id={`${this.selectorId}-trigger`}>
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
        <UserSelectPopover
          isOpen={isOpen}
          onToggle={onToggle}
          target={`${this.selectorId}-trigger`}
          trigger="legacy"
          offset={[0, 8]}
          options={displayItems.map(this.toOption)}
          selectedOptions={selectedItems.map(this.toOption)}
          query={query}
          onQueryChange={this.onQueryChange}
          onClear={this.clearQuery}
          inputRef={ref => this.searchInput = ref}
          searchPlaceholder={gettext('Find users')}
          isLoading={isLoading}
          emptyText={query.trim() ? gettext('User not found') : gettext('Enter characters to start searching')}
          onSelect={this.onSelectOption}
          onRemove={this.onSelectOption}
        />
      </>
    );
  }
}

LogUserSelector.propTypes = propTypes;

export default LogUserSelector;
