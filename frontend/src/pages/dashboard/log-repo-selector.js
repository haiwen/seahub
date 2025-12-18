import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Icon from '../../components/icon';

import '../../css/log-filter.css';

const propTypes = {
  items: PropTypes.array.isRequired,
  selectedItems: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  searchReposFunc: PropTypes.func.isRequired,
};

class LogRepoSelector extends Component {

  constructor(props) {
    super(props);
    this.state = {
      query: '',
      isLoading: false,
      searchResults: []
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
    if (this.props.isOpen && !this.repoSelector.contains(e.target)) {
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
    this.searchRepos(value);
  };

  searchRepos = (value) => {
    this.finalValue = value;
    if (value.length > 0) {
      this.setState({ isLoading: true });
      setTimeout(() => {
        if (this.finalValue === value) {
          this.props.searchReposFunc(value).then((res) => {
            const repos = res.data.repo_list || res.data.repos || [];
            this.setState({
              searchResults: repos,
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
      <div className="position-relative d-inline-block" ref={this.dropdownRef}>
        <span
          className="cur-activity-modifiers d-inline-block p-2 rounded"
          onClick={this.onToggleClick}
          aria-label={gettext('Toggle repo selector')}
          role="button"
          title={gettext('Toggle repo selector')}
        >
          {selectedItems.length > 0 ? (
            <>
              <span>{gettext('Libraries')}{':'}</span>
              <span className="d-inline-block ml-1">{selectedItems.map(item => item.name).join(', ')}</span>
            </>
          ) : gettext('Libraries')}
          <Icon symbol="down" className="ml-2 toggle-icon" />
        </span>
        {isOpen && (
          <div className="position-absolute activity-modifier-selector-container rounded" ref={ref => this.repoSelector = ref}>
            <ul className="activity-selected-modifiers px-3 py-1 list-unstyled">
              {selectedItems.map((item, index) => (
                <li key={index} className="activity-selected-modifier">
                  <i className="fas fa-folder"></i>
                  <span className="activity-user-name ml-2">{item.name}</span>
                  <span className="unselect-activity-user ml-2" onClick={(e) => {this.toggleSelectItem(e, item);}}>
                    <Icon symbol="close" />
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-3 pt-3">
              <Input
                type="text"
                placeholder={gettext('Find libraries')}
                value={query}
                onChange={this.onQueryChange}
              />
            </div>
            <ul className="activity-user-list list-unstyled p-3 o-auto">
              {isLoading ? (
                <li className="text-center">{gettext('Loading...')}</li>
              ) : displayItems.length === 0 ? (
                <li className="text-center">
                  {query ? gettext('Library not found') : gettext('Enter characters to start searching')}
                </li>
              ) : (
                displayItems.map((item, index) => {
                  const isSelected = selectedItems.some(selected => selected.id === item.id);
                  return (
                    <li key={index}
                      className="activity-user-item h-6 p-1 rounded d-flex justify-content-between align-items-center"
                      onClick={(e) => {this.toggleSelectItem(e, item);}}
                    >
                      <div>
                        <i className="fas fa-folder"></i>
                        <span className="activity-user-name ml-2">{item.name}</span>
                      </div>
                      {isSelected && <Icon symbol="tick" className="text-gray font-weight-bold" />}
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

LogRepoSelector.propTypes = propTypes;

export default LogRepoSelector;
