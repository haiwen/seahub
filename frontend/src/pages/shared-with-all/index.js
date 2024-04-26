import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, canAddPublicRepo } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Repo from '../../models/repo';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';
import SortOptionsDialog from '../../components/dialog/sort-options';
import TopToolbar from './top-toolbar';

const propTypes = {
  onShowSidePanel: PropTypes.func,
  onSearchedClick: PropTypes.func,
  inAllLibs: PropTypes.bool
};

class PublicSharedView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errMessage: '',
      repoList: [],
      sortBy: cookie.load('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
      isSortOptionsDialogOpen: false,
      libraryType: 'public',
    };
  }

  componentDidMount() {
    seafileAPI.listRepos({type: 'public'}).then((res) => {
      let repoList = res.data.repos.map(item => {
        let repo = new Repo(item);
        return repo;
      });
      this.setState({
        isLoading: false,
        repoList: Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  onItemUnshare = (repo) => {
    seafileAPI.unshareRepo(repo.repo_id, {share_type: 'public'}).then(() => {
      let repoList = this.state.repoList.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
      this.setState({repoList: repoList});
      let message = gettext('Successfully unshared {name}').replace('{name}', repo.repo_name);
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = gettext('Failed to unshare {name}').replace('{name}', repo.repo_name);
      }
      toaster(errMessage);
    });
  };

  onItemDelete = () => {
    // todo need to optimized
  };

  addRepoItem = (repo) => {
    let isExist = false;
    let repoIndex = 0;
    let repoList = this.state.repoList;
    for (let i = 0; i < repoList.length; i ++) {
      if (repo.repo_id === repoList[i].repo_id) {
        isExist = true;
        repoIndex = i;
        break;
      }
    }
    if (isExist) {
      this.state.repoList.splice(repoIndex, 1);
    }

    let newRepoList = this.state.repoList.map(item => {return item;});
    newRepoList.unshift(repo);
    this.setState({repoList: newRepoList});
  };

  sortItems = (sortBy, sortOrder) => {
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      repoList: Utils.sortRepos(this.state.repoList, sortBy, sortOrder)
    });
  };

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  };

  renderContent = () => {
    const { errMessage } = this.state;
    const emptyTip = (
      <EmptyTip>
        <h2>{gettext('No public libraries')}</h2>
        <p>{gettext('No public libraries have been created yet. A public library is accessible by all users. You can create a public library by clicking the "Add Library" button in the menu bar.')}</p>
      </EmptyTip>
    );
    const { inAllLibs = false } = this.props; // inAllLibs: in 'All Libs'('Files') page
    return (
      <>
        {this.state.isLoading && <Loading />}
        {(!this.state.isLoading && errMessage) && errMessage}
        {(!this.state.isLoading && this.state.repoList.length === 0) && emptyTip}
        {(!this.state.isLoading && this.state.repoList.length > 0) &&
        <SharedRepoListView
          libraryType={this.state.libraryType}
          repoList={this.state.repoList}
          sortBy={this.state.sortBy}
          sortOrder={this.state.sortOrder}
          sortItems={this.sortItems}
          onItemUnshare={this.onItemUnshare}
          onItemDelete={this.onItemDelete}
          theadHidden={inAllLibs}
        />
        }
      </>
    );
  };

  renderSortIconInMobile = () => {
    return (
      <>

        {(!Utils.isDesktop() && this.state.repoList.length > 0) && <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
      </>
    );
  };

  render() {
    const { inAllLibs = false } = this.props; // inAllLibs: in 'All Libs'('Files') page

    if (inAllLibs) {
      return (
        <>
          <div className="d-flex justify-content-between mt-3 p-1 border-bottom">
            <h4 className="sf-heading m-0">
              <span className="sf3-font-share-with-all sf3-font nav-icon" aria-hidden="true"></span>
              {gettext('Shared with all')}
            </h4>
            {this.renderSortIconInMobile()}
          </div>
          {this.renderContent()}
        </>
      );
    }

    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          {canAddPublicRepo && <TopToolbar onShowSidePanel={this.props.onShowSidePanel} addRepoItem={this.addRepoItem} />}
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0">{gettext('Shared with all')}</h3>
              {this.renderSortIconInMobile()}
            </div>
            <div className="cur-view-content">
              {this.renderContent()}
            </div>
          </div>
        </div>
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

PublicSharedView.propTypes = propTypes;

export default PublicSharedView;
