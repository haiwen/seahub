import React, { Component } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import classnames from 'classnames';
import { gettext } from '../../../../utils/constants';
import { debounce, Utils } from '../../../../utils/utils';
import toaster from '../../../toast';
import Loading from '../../../loading';
import IconBtn from '../../../icon-btn';
import { SEARCH_FILTERS_SHOW_KEY } from '../../../../constants';
import { repoTrashAPI } from '../../../../utils/repo-trash-api';
import TrashFilters from './search-filters';
import Icon from '../../../icon';

import './search-trash.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  onSearchResults: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

const PER_PAGE = 20;

class SearchTrash extends Component {

  constructor(props) {
    super(props);
    this.state = {
      value: '',
      isLoading: false,
      isFilterControllerActive: false,
      filters: {
        date: {
          value: '',
          from: null,
          to: null,
        },
        suffixes: '',
        creator_list: [],
      },
    };
    this.source = null;
    this.inputRef = React.createRef();
    this.debouncedSearch = debounce(this.searchTrash, 300);
  }

  handleError = (e) => {
    if (!axios.isCancel(e)) {
      const errMessage = Utils.getErrorMsg(e);
      toaster.danger(errMessage);
    }
    this.setState({ isLoading: false });
  };

  onChangeHandler = (event) => {
    const newValue = event.target.value;
    this.setState({ value: newValue });
    this.debouncedSearch(newValue);
  };

  handleFiltersShow = () => {
    const { isFiltersShow } = this.state;
    localStorage.setItem(SEARCH_FILTERS_SHOW_KEY, !isFiltersShow);
    this.setState({ isFiltersShow: !isFiltersShow });
  };

  searchTrash = (query) => {
    if (this.source) {
      this.source.cancel('prev request is cancelled');
    }
    this.source = axios.CancelToken.source();

    this.setState({ isLoading: true });

    const { repoID } = this.props;
    const page = 1;
    const per_page = PER_PAGE;
    const { suffixes, date, creator_list } = this.state.filters;
    const creators = creator_list.map(user => user.email).join(',');

    repoTrashAPI.searchRepoFolderTrash(repoID, page, per_page, query.trim(), { suffixes, date, creators }).then(res => {
      const items = Array.isArray(res.data.items) ? res.data.items : [];
      const hasMore = Boolean(res.data.has_more);
      this.props.onSearchResults({ items, hasMore });
      this.setState({
        isLoading: false
      });
    }).catch(error => {
      this.setState({ isLoading: false });
      toaster.danger(gettext('Search failed. Please try again.'));
    });
  };

  handleFiltersChange = (key, value) => {
    const newFilters = { ...this.state.filters, [key]: value };
    const hasActiveFilter = newFilters.suffixes || newFilters.date.value;
    this.setState({
      filters: newFilters,
      isFilterControllerActive: hasActiveFilter
    }, () => {
      this.searchTrash(this.state.value);
    });
  };

  onClearSearch = () => {
    this.setState({ value: '' });
    this.props.onSearchResults({ reset: true });
  };

  render() {
    const { placeholder } = this.props;
    const { value, isLoading, isFilterControllerActive, filters, isFiltersShow } = this.state;
    return (
      <div className="search-container search-trash">
        <div className="search-controls">
          <div className="input-icon">
            <span className="search-icon-left">
              <Icon symbol="search" />
            </span>
            <input
              type="text"
              className="form-control search-trash-input"
              name="query"
              placeholder={placeholder || gettext('Search in trash...')}
              value={this.state.value}
              onChange={this.onChangeHandler}
              autoComplete="off"
              ref={this.inputRef}
            />
            {value && (
              <IconBtn
                symbol="x-01"
                className="search-icon-right"
                onClick={this.onClearSearch}
                aria-label={gettext('Clear search')}
                title={gettext('Clear search')}
              />
            )}
            <IconBtn
              symbol="filter-circled"
              title={isFiltersShow ? gettext('Hide advanced search') : gettext('Show advanced search')}
              aria-label={isFiltersShow ? gettext('Hide advanced search') : gettext('Show advanced search')}
              size={20}
              className={classnames('search-icon-right input-icon-addon search-filter-controller', { 'active': isFilterControllerActive })}
              onClick={this.handleFiltersShow}
              tabIndex={0}
              role="button"
              onKeyDown={Utils.onKeyDown}
              id="search-filter-controller"
            />
          </div>
          {isFiltersShow && <TrashFilters filters={filters} onChange={this.handleFiltersChange} />}
        </div>
        {isLoading && (
          <div className="search-loading-indicator">
            <Loading />
          </div>
        )}
      </div>
    );
  }
}

SearchTrash.propTypes = propTypes;

export default SearchTrash;
