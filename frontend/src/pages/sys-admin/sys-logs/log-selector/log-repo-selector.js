import React, { Component } from 'react';
import { Input, Popover } from 'reactstrap';
import PropTypes from 'prop-types';
import Icon from '@/components/icon';
import toaster from '@/components/toast';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';

import './index.css';

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
    this.finalValue = '';
  }

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
    const { selectedItems, isOpen, onToggle } = this.props;
    const displayItems = query.trim() ? searchResults : this.props.items;

    return (
      <>
        <span id="log-repo-selector-trigger">
          <span
            className="cur-activity-modifiers"
            onClick={onToggle}
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
            <Icon symbol="down" className="ml-1 toggle-icon" />
          </span>
        </span>
        <Popover
          isOpen={isOpen}
          toggle={onToggle}
          target="log-repo-selector-trigger"
          placement="bottom-start"
          hideArrow={true}
          fade={false}
          trigger="legacy"
          popperClassName="activity-user-selector-popover"
          innerClassName="activity-user-selector-content"
        >
          <ul className="activity-selected-modifiers">
            {selectedItems.map((item, index) => (
              <li key={index} className="activity-selected-modifier">
                <i className="fas fa-folder"></i>
                <span className="activity-user-name" title={item.name}>{item.name}</span>
                <span className="unselect-activity-user" onClick={(e) => { this.toggleSelectItem(e, item); }}>
                  <Icon symbol="close" />
                </span>
              </li>
            ))}
          </ul>
          <div className="activity-user-selector-search">
            <Input
              type="text"
              className="activity-user-selector-input"
              placeholder={gettext('Find libraries')}
              value={query}
              onChange={this.onQueryChange}
            />
          </div>
          {isLoading ? (
            <div className="activity-user-loading">{gettext('Loading...')}</div>
          ) : displayItems.length === 0 ? (
            <div className="activity-user-selector-empty" role="status">
              {query.trim() ? gettext('Library not found') : gettext('Enter characters to start searching')}
            </div>
          ) : (
            <ul className="activity-user-list">
              {displayItems.map((item, index) => {
                const isSelected = selectedItems.some(selected => selected.id === item.id);
                return (
                  <li key={index}
                    className="activity-user-item d-flex justify-content-between align-items-center"
                    onClick={(e) => { this.toggleSelectItem(e, item); }}
                  >
                    <span className="avatar-name-wrapper">
                      <i className="fas fa-folder"></i>
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

LogRepoSelector.propTypes = propTypes;

export default LogRepoSelector;
