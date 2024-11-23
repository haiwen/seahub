import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import cookie from 'react-cookies';
import Repo from '../../models/repo';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import ViewModes from '../../components/view-modes';
import ReposSortMenu from '../../components/sort-menu';
import SortOptionsDialog from '../../components/dialog/sort-options';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import Content from './content';

class SharedLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      currentViewMode: localStorage.getItem('sf_repo_list_view_mode') || LIST_MODE,
      sortBy: cookie.load('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
      isSortOptionsDialogOpen: false
    };
  }

  componentDidMount() {
    if (!this.props.repoList) {
      seafileAPI.listRepos({ type: 'shared' }).then((res) => {
        let repoList = res.data.repos.map((item) => {
          return new Repo(item);
        });
        this.setState({
          loading: false,
          items: Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder)
        });
      }).catch((error) => {
        this.setState({
          loading: false,
          errorMsg: Utils.getErrorMsg(error, true)
        });
      });
    } else {
      this.setState({
        loading: false,
        items: this.props.repoList
      });
    }
  }

  sortItems = (sortBy, sortOrder) => {
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortRepos(this.state.items, sortBy, sortOrder)
    });
  };

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  };

  onMonitorRepo = (repo, monitored) => {
    let items = this.state.items.map(item => {
      if (item.repo_id === repo.repo_id) {
        item.monitored = monitored;
      }
      return item;
    });
    this.setState({ items: items });
  };

  renderContent = (currentViewMode) => {
    const { inAllLibs = false, repoList } = this.props; // inAllLibs: in 'All Libs'('Files') page
    const { items } = this.state;
    return (
      <Content
        loading={this.state.loading}
        errorMsg={this.state.errorMsg}
        items={inAllLibs ? repoList : items}
        sortBy={this.state.sortBy}
        sortOrder={this.state.sortOrder}
        sortItems={this.sortItems}
        onMonitorRepo={this.onMonitorRepo}
        inAllLibs={inAllLibs}
        currentViewMode={currentViewMode}
      />
    );
  };

  renderSortIconInMobile = () => {
    return (
      <>
        {(!Utils.isDesktop() && this.state.items.length > 0) && <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
      </>
    );
  };

  switchViewMode = (newMode) => {
    this.setState({
      currentViewMode: newMode
    }, () => {
      localStorage.setItem('sf_repo_list_view_mode', newMode);
    });
  };

  onSelectSortOption = (sortOption) => {
    const [sortBy, sortOrder] = sortOption.value.split('-');
    this.setState({ sortBy, sortOrder }, () => {
      this.sortItems(sortBy, sortOrder);
    });
  };

  render() {
    const { inAllLibs = false, currentViewMode: propCurrentViewMode } = this.props; // inAllLibs: in 'All Libs'('Files') page
    const { sortBy, sortOrder, currentViewMode: stateCurrentViewMode } = this.state;
    const currentViewMode = inAllLibs ? propCurrentViewMode : stateCurrentViewMode;

    return (
      <Fragment>
        {inAllLibs ? (
          <>
            <div className={`d-flex justify-content-between mt-3 py-1 ${currentViewMode == LIST_MODE ? 'sf-border-bottom' : ''}`}>
              <h4 className="sf-heading m-0">
                <span className="sf3-font-share-with-me sf3-font nav-icon" aria-hidden="true"></span>
                {gettext('Shared with me')}
              </h4>
              {this.renderSortIconInMobile()}
            </div>
            {this.renderContent(currentViewMode)}
          </>
        ) : (
          <div className="main-panel-center">
            <div className="cur-view-container">
              <div className="cur-view-path">
                <h3 className="sf-heading m-0">{gettext('Shared with me')}</h3>
                {Utils.isDesktop() && (
                  <div className="d-flex align-items-center">
                    <div className="mr-2">
                      <ViewModes currentViewMode={currentViewMode} switchViewMode={this.switchViewMode} />
                    </div>
                    <ReposSortMenu sortBy={sortBy} sortOrder={sortOrder} onSelectSortOption={this.onSelectSortOption}/>
                  </div>
                )}
                {this.renderSortIconInMobile()}
              </div>
              <div className={classnames('cur-view-content', 'repos-container', { 'pt-3': currentViewMode != LIST_MODE })}>
                {this.renderContent(currentViewMode)}
              </div>
            </div>
          </div>
        )}
        {this.state.isSortOptionsDialogOpen &&
        <SortOptionsDialog
          toggleDialog={this.toggleSortOptionsDialog}
          sortBy={this.state.sortBy}
          sortOrder={this.state.sortOrder}
          sortItems={this.sortItems}
        />
        }
      </Fragment>
    );
  }
}

SharedLibraries.propTypes = {
  currentViewMode: PropTypes.string,
  inAllLibs: PropTypes.bool,
  repoList: PropTypes.array,
};

export default SharedLibraries;
