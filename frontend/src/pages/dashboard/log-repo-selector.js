import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { gettext } from '../../utils/constants';
import '../../css/log-filter.css';

class LogRepoSelector extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
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
    const { isOpen } = this.state;
    if (isOpen && !this.repoSelector.contains(e.target)) {
      this.togglePopover();
    }
  };

  togglePopover = () => {
    const { isOpen } = this.state;
    if (isOpen) {
      this.props.onSelect(null, true);
    }
    this.setState({
      isOpen: !isOpen
    });
  };

  onToggleClick = (e) => {
    e.stopPropagation();
    this.togglePopover();
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
          const filteredItems = this.props.items.filter(item => 
            item.name.toLowerCase().includes(value.trim().toLowerCase())
          );
          this.setState({
            searchResults: filteredItems,
            isLoading: false
          });
        }
      }, 300);
    } else {
      this.setState({ searchResults: [] });
    }
  };

  toggleSelectItem = (e, item) => {
    e.stopPropagation();
    this.props.onSelect(item, false);
  };

  render() {
    const { isOpen, query, isLoading, searchResults } = this.state;
    const { selectedItems } = this.props;
    const displayItems = query.trim() ? searchResults : this.props.items;

    return (
      <div className="mt-4 position-relative" ref={this.dropdownRef}>
        <span className="cur-activity-modifiers d-inline-block p-2 rounded" onClick={this.onToggleClick}>
          {selectedItems.length > 0 ? (
            <>
              <span>{gettext('Libraries:')}</span>
              <span className="d-inline-block ml-1">{selectedItems.map(item => item.name).join(', ')}</span>
            </>
          ) : gettext('Libraries')}
          <i className="sf3-font sf3-font-down ml-2 toggle-icon"></i>
        </span>
        {isOpen && (
          <div className="position-absolute activity-modifier-selector-container rounded shadow" ref={ref => this.repoSelector = ref}>
            <ul className="activity-selected-modifiers px-3 py-1 list-unstyled">
              {selectedItems.map((item, index) => (
                <li key={index} className="activity-selected-modifier">
                  <i className="fas fa-folder"></i>
                  <span className="activity-user-name ml-2">{item.name}</span>
                  <i className="sf2-icon-close unselect-activity-user ml-2" onClick={(e) => {this.toggleSelectItem(e, item);}}></i>
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
                  const isSelected = selectedItems.some(selected => selected.repo_id === item.repo_id);
                  return (
                    <li key={index} 
                      className="activity-user-item h-6 p-1 rounded d-flex justify-content-between align-items-center" 
                      onClick={(e) => {this.toggleSelectItem(e, item);}}
                    >
                      <div>
                        <i className="fas fa-folder"></i>
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

LogRepoSelector.propTypes = {
  items: PropTypes.array.isRequired,
  selectedItems: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired
};

export default LogRepoSelector;
