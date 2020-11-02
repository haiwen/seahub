import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import MediaQuery from 'react-responsive';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, canAddPublicRepo } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Repo from '../../models/repo';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import ModalPortal from '../../components/modal-portal';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import ShareRepoDialog from '../../components/dialog/share-repo-dialog';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';
import SortOptionsDialog from '../../components/dialog/sort-options';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

class PublicSharedView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errMessage: '',
      emptyTip: '',
      repoList: [],
      sortBy: cookie.load('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
      isSortOptionsDialogOpen: false,
      libraryType: 'public',
      isCreateMenuShow: false,
      isCreateRepoDialogShow: false,
      isSelectRepoDialpgShow: false,
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

  onCreateRepo = (repo) => {
    seafileAPI.createPublicRepo(repo).then(res => {
      let object = {  // need modify api return value
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
      let repoList = this.addRepoItem(repo);
      this.setState({repoList: repoList});
      this.onCreateRepoToggle();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onRepoSelectedHandler = (selectedRepoList) => {
    selectedRepoList.forEach(repo => {
      seafileAPI.selectOwnedRepoToPublic(repo.repo_id, {share_type: 'public', permission: repo.sharePermission}).then(() => {
        let repoList = this.addRepoItem(repo);
        this.setState({repoList: repoList});
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
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
  }

  onItemDelete = () => {
    // todo need to optimized
  }

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
    return newRepoList;
  }

  onAddRepoToggle = () => {
    this.setState({isCreateMenuShow: !this.state.isCreateMenuShow});
  }

  onCreateRepoToggle = () => {
    this.setState({isCreateRepoDialogShow: !this.state.isCreateRepoDialogShow});
  }

  onSelectRepoToggle = () => {
    this.setState({isSelectRepoDialpgShow: !this.state.isSelectRepoDialpgShow});
  }

  sortItems = (sortBy, sortOrder) => {
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      repoList: Utils.sortRepos(this.state.repoList, sortBy, sortOrder)
    });
  }

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  }

  render() {
    let errMessage = this.state.errMessage;
    let emptyTip = (
      <EmptyTip>
        <h2>{gettext('No public libraries')}</h2>
        <p>{gettext('No public libraries have been created yet. A public library is accessible by all users. You can create a public library by clicking the "Add Library" button in the menu bar.')}</p>
      </EmptyTip>
    );
    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          {canAddPublicRepo &&
            <div className="cur-view-toolbar">
              <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
              <div className="operation">
                <Dropdown isOpen={this.state.isCreateMenuShow} toggle={this.onAddRepoToggle}>
                  <MediaQuery query="(min-width: 768px)">
                    <DropdownToggle className='btn btn-secondary operation-item'>
                      <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Add Library')}
                    </DropdownToggle>
                  </MediaQuery>
                  <MediaQuery query="(max-width: 767.8px)">
                    <DropdownToggle
                      tag="span"
                      className="sf2-icon-plus mobile-toolbar-icon"
                      title={gettext('Add Library')}
                    />
                  </MediaQuery>
                  <DropdownMenu>
                    <DropdownItem onClick={this.onSelectRepoToggle}>{gettext('Share existing libraries')}</DropdownItem>
                    <DropdownItem onClick={this.onCreateRepoToggle}>{gettext('New Library')}</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            </div>
          }
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0">{gettext('Shared with all')}</h3>
              {(!Utils.isDesktop() && this.state.repoList.length > 0) && <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
            </div>
            <div className="cur-view-content">
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
                />
              }
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
        {this.state.isCreateRepoDialogShow && (
          <ModalPortal>
            <CreateRepoDialog
              libraryType={this.state.libraryType}
              onCreateToggle={this.onCreateRepoToggle}
              onCreateRepo={this.onCreateRepo}
            />
          </ModalPortal>
        )}
        {this.state.isSelectRepoDialpgShow && (
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

PublicSharedView.propTypes = propTypes;

export default PublicSharedView;
