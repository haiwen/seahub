import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { gettext } from '../../utils/constants';
import '../../css/log-filter.css';

class LogFilter extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      searchText: '',
      query: ''
    };
    this.dropdownRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener('click', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  }

  handleClickOutside = (e) => {
    const { isOpen } = this.state;
    if (isOpen && !this.userSelector.contains(e.target)) {
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

  handleSearch = (e) => {
    this.setState({ searchText: e.target.value });
  };

  onQueryChange = (e) => {
    this.setState({ query: e.target.value });
  };

  toggleSelectItem = (e, item) => {
    e.stopPropagation();
    this.props.onSelect(item, false);
  };

  render() {
    const { isOpen, query } = this.state;
    const { items, selectedItems } = this.props;
    const filteredItems = query.trim() ? 
      items.filter(item => 
        item.email.toLowerCase().includes(query.trim().toLowerCase()) || 
        item.name.toLowerCase().includes(query.trim().toLowerCase())
      ) : items;

    return (
      <div className="mt-4 position-relative" ref={this.dropdownRef}>
        <span className="cur-activity-modifiers d-inline-block p-2 rounded" onClick={this.onToggleClick}>
          {selectedItems.length > 0 ? (
            <>
              <span>{gettext('Users:')}</span>
              <span className="d-inline-block ml-1">{selectedItems.map(item => item.name).join(', ')}</span>
            </>
          ) : gettext('Users')}
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
              {filteredItems.map((item, index) => {
                return (
                  <li key={index} className="activity-user-item h-6 p-1 rounded d-flex justify-content-between align-items-center" onClick={(e) => {this.toggleSelectItem(e, item);}}>
                    <div>
                      <img src={item.avatar_url} className="avatar w-5 h-5" alt="" />
                      <span className="activity-user-name ml-2">{item.name}</span>
                    </div>
                    {item.isSelected && <i className="sf2-icon-tick text-gray font-weight-bold"></i>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }
}

LogFilter.propTypes = {
  items: PropTypes.array.isRequired,
  selectedItems: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired
};

export default LogFilter;
