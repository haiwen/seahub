import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { gettext } from '../../utils/constants';
import '../../css/log-filter.css';
import { systemAdminAPI } from '../../utils/system-admin-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';

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
    this.searchUsers(value);
  };

  searchUsers = (value) => {
    this.finalValue = value;
    if (value.length > 0) {
      this.setState({ isLoading: true });
      setTimeout(() => {
        if (this.finalValue === value) {
          systemAdminAPI.sysAdminSearchUsers(value).then((res) => {
            this.setState({
              searchResults: res.data.user_list,
              isLoading: false
            });
          }).catch(error => {
            this.setState({ isLoading: false });
            let errMessage = Utils.getErrorMsg(error);
            toaster.danger(errMessage);
          });
        }
      }, 500);
    } else {
      this.setState({ searchResults: [] });
    }
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
        <span className="cur-activity-modifiers d-inline-block p-2 rounded" onClick={this.onToggleClick}>
          {selectedItems.length > 0 ? (
            <>
              <span>{gettext(this.props.componentName + ":")}</span>
              <span className="d-inline-block ml-1">{selectedItems.map(item => item.name).join(', ')}</span>
            </>
          ) : gettext(this.props.componentName)}
          <i className="sf3-font sf3-font-down ml-2 toggle-icon"></i>
        </span>
        {isOpen && (
          <div className="position-absolute activity-modifier-selector-container rounded shadow" ref={ref => this.userSelector = ref}>
            <ul className="activity-selected-modifiers px-3 py-1 list-unstyled">
              {selectedItems.map((item, index) => {
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
                  const isSelected = selectedItems.some(selected => selected.email === item.email);
                  return (
                    <li key={index}
                      className="activity-user-item h-6 p-1 rounded d-flex justify-content-between align-items-center"
                      onClick={(e) => {this.toggleSelectItem(e, item);}}
                    >
                      <div>
                        <img src={item.avatar_url} className="avatar w-5 h-5" alt="" />
                        <span className="activity-user-name ml-2">{item.name}</span>
                      </div>
                      {isSelected && <i className="sf2-icon-tick text-gray font-weight-bold"></i>}
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

LogUserSelector.propTypes = {
  componentName: PropTypes.string,
  items: PropTypes.array.isRequired,
  selectedItems: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
};

export default LogUserSelector;
