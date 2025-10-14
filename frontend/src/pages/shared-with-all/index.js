import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Cookies from 'js-cookie';
import classnames from 'classnames';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, canAddPublicRepo } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Repo from '../../models/repo';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';
import SortOptionsDialog from '../../components/dialog/sort-options';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import ModalPortal from '../../components/modal-portal';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import ShareRepoDialog from '../../components/dialog/share-repo-dialog';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import ViewModes from '../../components/view-modes';
import ReposSortMenu from '../../components/sort-menu';

const propTypes = {
  currentViewMode: PropTypes.string,
  inAllLibs: PropTypes.bool,
  repoList: PropTypes.array,
};

class SharedWithAll extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errMessage: '',
      repoList: [],
      isCreateRepoDialogOpen: false,
      isSelectRepoDialogOpen: false,
      currentViewMode: localStorage.getItem('sf_repo_list_view_mode') || LIST_MODE,
      sortBy: Cookies.get('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: Cookies.get('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
      isSortOptionsDialogOpen: false,
      libraryType: 'public',
    };
  }

  componentDidMount() {
    if (!this.props.repoList) {
      seafileAPI.listRepos({ type: 'public' }).then((res) => {
        let repoList = res.data.repos.map((item) => {
          return new Repo(item);
        });
        this.setState({
          isLoading: false,
          repoList: Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder)
        });
      }).catch((error) => {
        this.setState({
          isLoading: false,
          errMessage: Utils.getErrorMsg(error, true)
        });
      });
    } else {
      this.setState({
        isLoading: false,
        repoList: Utils.sortRepos(this.props.repoList, this.state.sortBy, this.state.sortOrder)
      });
    }
  }

  onItemUnshare = (repo) => {
    seafileAPI.unshareRepo(repo.repo_id, { share_type: 'public' }).then(() => {
      let repoList = this.state.repoList.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
      this.setState({ repoList: repoList });
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
    this.setState({ repoList: newRepoList });
  };

  sortItems = (sortBy, sortOrder) => {
    Cookies.set('seafile-repo-dir-sort-by', sortBy);
    Cookies.set('seafile-repo-dir-sort-order', sortOrder);
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

  renderContent = (currentViewMode) => {
    const { inAllLibs = false } = this.props; // inAllLibs: in 'All Libs'('Files') page
    const { isLoading, errMessage, repoList } = this.state;
    const emptyTip = inAllLibs
      ? <p className={`libraries-empty-tip-in-${currentViewMode}-mode`}>{gettext('No public libraries')}</p>
      : (
        <EmptyTip
          title={gettext('No public libraries')}
          text={gettext('No public libraries have been created yet. A public library is accessible by all users. You can create a public library by clicking the "Add Library" item in the dropdown menu.')}
        >
        </EmptyTip>
      );
    return (
      <>
        {isLoading
          ? <Loading />
          : errMessage
            ? <p className="error text-center">{errMessage}</p>
            : repoList.length == 0
              ? emptyTip
              : (
                <SharedRepoListView
                  key='public-shared-view'
                  libraryType={this.state.libraryType}
                  repoList={this.state.repoList}
                  sortBy={this.state.sortBy}
                  sortOrder={this.state.sortOrder}
                  sortItems={this.sortItems}
                  onItemUnshare={this.onItemUnshare}
                  onItemDelete={this.onItemDelete}
                  currentViewMode={currentViewMode}
                  inAllLibs={inAllLibs}
                />
              )}
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

  onCreateRepoToggle = () => {
    this.setState({ isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen });
  };

  onSelectRepoToggle = () => {
    this.setState({ isSelectRepoDialogOpen: !this.state.isSelectRepoDialogOpen });
  };

  onCreateRepo = (repo) => {
    this.onCreateRepoToggle();
    seafileAPI.createPublicRepo(repo).then(res => {
      let object = {
        repo_id: res.data.id,
        repo_name: res.data.name,
        permission: res.data.permission,
        size: res.data.size,
        owner_name: res.data.owner_name,
        owner_email: res.data.owner,
        mtime: res.data.mtime,
        encrypted: res.data.encrypted,
      };
      let repo = new Repo(object);
      this.addRepoItem(repo);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onRepoSelectedHandler = (selectedRepoList) => {
    selectedRepoList.forEach(repo => {
      seafileAPI.selectOwnedRepoToPublic(repo.repo_id, { share_type: 'public', permission: repo.sharePermission }).then(() => {
        this.addRepoItem(repo);
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    });
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

    if (inAllLibs) {
      return (
        <>
          <div className={`d-flex justify-content-between mt-3 py-1 ${currentViewMode == LIST_MODE ? 'sf-border-bottom' : ''}`}>
            <h4 className="sf-heading m-0">
              <span className="sf3-font-share-with-all sf3-font nav-icon" aria-hidden="true"></span>
              {gettext('Shared with all')}
            </h4>
            {this.renderSortIconInMobile()}
          </div>
          {this.renderContent(currentViewMode)}
        </>
      );
    }

    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0 d-flex align-items-center">
                {gettext('Shared with all')}
                {canAddPublicRepo &&
                <SingleDropdownToolbar
                  withPlusIcon={true}
                  opList={[
                    { 'text': gettext('Share existing libraries'), 'onClick': this.onSelectRepoToggle },
                    { 'text': gettext('New Library'), 'onClick': this.onCreateRepoToggle }
                  ]}
                />
                }
              </h3>
              {Utils.isDesktop() && (
                <div className="d-flex align-items-center">
                  <ViewModes currentViewMode={currentViewMode} switchViewMode={this.switchViewMode} />
                  <ReposSortMenu className="ml-2" sortBy={sortBy} sortOrder={sortOrder} onSelectSortOption={this.onSelectSortOption}/>
                </div>
              )}
              {this.renderSortIconInMobile()}
            </div>
            <div className={classnames('cur-view-content', 'repos-container', { 'pt-3': currentViewMode != LIST_MODE })}>
              {this.renderContent(currentViewMode)}
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
        {this.state.isCreateRepoDialogOpen && (
          <ModalPortal>
            <CreateRepoDialog
              libraryType={this.state.libraryType}
              onCreateToggle={this.onCreateRepoToggle}
              onCreateRepo={this.onCreateRepo}
            />
          </ModalPortal>
        )}
        {this.state.isSelectRepoDialogOpen && (
          <ModalPortal>
            <ShareRepoDialog
              onRepoSelectedHandler={this.onRepoSelectedHandler}
              onShareRepoDialogClose={this.onSelectRepoToggle}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

SharedWithAll.propTypes = propTypes;

export default SharedWithAll;
