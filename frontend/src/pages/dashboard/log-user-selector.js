import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Icon from '../../components/icon';

import '../../css/log-filter.css';

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
    this.dropdownRef = React.createRef();
    this.finalValue = '';
  }

  componentDidMount() {
    document.addEventListener('click', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }

  handleClickOutside = (e) => {
    if (this.props.isOpen && !this.userSelector.contains(e.target)) {
      this.props.onToggle();
    }
  };

  onToggleClick = (e) => {
    e.stopPropagation();
    this.props.onToggle();
  };

  onQueryChange = (e) => {
    const value = e.target.value;
    this.setState({ query: value });
    this.handleSearchUser(value);
  };

  handleSearchUser = (value) => {
    if (!value.trim()) {
      this.setState({
        searchResults: []
      });
      return;
    }

    this.setState({
      isLoading: true
    });

    this.finalValue = value;

    setTimeout(() => {
      if (this.finalValue === value) {
        if (this.props.searchUsersFunc) {
          this.props.searchUsersFunc(value).then((res) => {
            const users = res.data.user_list || res.data.users || [];
            this.setState({
              searchResults: users,
              isLoading: false
            }, () => {
              if (this.props.searchGroupsFunc) {
                this.props.searchGroupsFunc(value).then((res) => {
                  const groups = res.data.group_list || res.data.groups || [];
                  this.setState({
                    searchResults: [...users, ...groups]
                  });
                });
              }
            });
          }).catch((error) => {
            this.setState({
              isLoading: false
            });
            let errMessage = Utils.getErrorMsg(error);
            toaster.danger(errMessage);
          });
        }
        if (this.props.searchGroupsFunc && !this.props.searchUsersFunc) {
          this.props.searchGroupsFunc(value).then((res) => {
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
    const { selectedItems, isOpen } = this.props;
    const displayItems = query.trim() ? searchResults : this.props.items;

    return (
      <div className="position-relative d-inline-block ml-2" ref={this.dropdownRef}>
        <span
          className="cur-activity-modifiers d-inline-block p-2 rounded"
          onClick={this.onToggleClick}
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
          <Icon symbol="arrow-down" className="ml-2 toggle-icon" />
        </span>
        {isOpen && (
          <div className="position-absolute activity-modifier-selector-container rounded" ref={ref => this.userSelector = ref}>
            <ul className="activity-selected-modifiers px-3 py-1 list-unstyled">
              {selectedItems.map((item, index) => {
                return (
                  <li key={index} className="activity-selected-modifier">
                    <img src={item.avatar_url} className="avatar w-5 h-5" alt="" />
                    <span className="activity-user-name ml-2">{item.name}</span>
                    <span className="unselect-activity-user ml-2" onClick={(e) => {this.toggleSelectItem(e, item);}}>
                      <Icon symbol="close" />
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="px-3 pt-3">
              <Input
                type="text"
                placeholder={gettext('Find users')}
                value={query}
                onChange={this.onQueryChange}
              />
            </div>
            <ul className="activity-user-list list-unstyled p-3 o-auto">
              {isLoading ? (
                <li className="text-center">{gettext('Loading...')}</li>
              ) : displayItems.length === 0 ? (
                <li className="text-center">
                  {query ? gettext('User not found') : gettext('Enter characters to start searching')}
                </li>
              ) : (
                displayItems.map((item, index) => {
                  const isSelected = selectedItems.some(selected =>
                    (item.email && selected.email === item.email) ||
                    (item.id && selected.id === item.id)
                  );
                  return (
                    <li key={index}
                      className="activity-user-item h-6 p-1 rounded d-flex justify-content-between align-items-center"
                      onClick={(e) => {this.toggleSelectItem(e, item);}}
                    >
                      <div>
                        <img src={item.avatar_url} className="avatar w-5 h-5" alt="" />
                        <span className="activity-user-name ml-2">{item.name}</span>
                      </div>
                      {isSelected && <Icon symbol="check-thin" className="text-gray font-weight-bold" />}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }
}

LogUserSelector.propTypes = propTypes;

export default LogUserSelector;
