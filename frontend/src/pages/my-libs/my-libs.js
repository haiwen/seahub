import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, loginUrl} from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Repo from '../../models/repo';
import Loading from '../../components/loading';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import RepoViewToolbar from '../../components/toolbar/repo-view-toobar';
import LibDetail from '../../components/dirent-detail/lib-details';
import MylibRepoListView from './mylib-repo-list-view';

class MyLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMsg: '',
      isLoading: true,
      repoList: [],
      isShowDetails: false,
      sortBy: 'name', // 'name' or 'time'
      sortOrder: 'asc' // 'asc' or 'desc'
    };

    this.emptyMessage = (
      <div className="empty-tip">
        <h2>{gettext('You have not created any libraries')}</h2>
        <p>{gettext('You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.')}</p>
      </div>
    );
  }

  componentDidMount() {
    seafileAPI.listRepos({type: 'mine'}).then((res) => {
      // res: {data: {...}, status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      let repoList = res.data.repos.map((item) => {
        return new Repo(item);
      });
      this.setState({
        isLoading: false,
        repoList: Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            isLoading: false,
            errorMsg: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            isLoading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          isLoading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  onCreateRepo = (repo) => {
    let permission = repo.permission;
    seafileAPI.createMineRepo(repo).then((res) => {
      let repo = {
        repo_id: res.data.repo_id,
        repo_name: res.data.repo_name,
        size: res.data.repo_size,
        mtime: res.data.mtime,
        owner_email: res.data.email,
        encrypted: res.data.encrypted,
        permission: permission,
      };
      this.state.repoList.unshift(repo);
      this.setState({repoList: this.state.repoList});
    });
  }

  sortRepoList = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      repoList: Utils.sortRepos(this.state.repoList, sortBy, sortOrder)
    });
  }

  onTransferRepo = (repoID) => {
    let repoList = this.state.repoList.filter(item => {
      return item.repo_id !== repoID;
    });
    this.setState({repoList: repoList});
  }

  onRenameRepo = (repo, newName) => {
    let repoList = this.state.repoList.map(item => {
      if (item.repo_id === repo.repo_id) {
        item.repo_name = newName;
      }
      return item;
    });
    this.setState({repoList: repoList});
  }
  
  onDeleteRepo = (repo) => {
    let repoList = this.state.repoList.filter(item => {
      return item.repo_id !== repo.repo_id;
    });
    this.setState({repoList: repoList});
  }

  onRepoClick = (repo) => {
    if (this.state.isShowDetails) {
      this.onRepoDetails(repo);
    }
  }

  onRepoDetails = (repo) => {
    this.setState({
      currentRepo: repo,
      isShowDetails: true,
    });
  }

  closeDetails = () => {
    this.setState({isShowDetails: !this.state.isShowDetails});
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          <RepoViewToolbar onShowSidePanel={this.props.onShowSidePanel} onCreateRepo={this.onCreateRepo} libraryType={'mine'}/>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('My Libraries')}</h3>
            </div>
            <div className="cur-view-content">
              {this.state.isLoading && <Loading />}
              {!this.state.isLoading && this.state.errorMsg &&  <p className="error text-center">{this.state.errorMsg}</p>}
              {!this.state.isLoading && this.state.repoList.length === 0 && this.emptyMessage}
              {!this.state.isLoading && this.state.repoList.length > 0 && 
                <MylibRepoListView
                  sortBy={this.state.sortBy}
                  sortOrder={this.state.sortOrder}
                  repoList={this.state.repoList}
                  onRenameRepo={this.onRenameRepo}
                  onDeleteRepo={this.onDeleteRepo}
                  onTransferRepo={this.onTransferRepo}
                  onRepoDetails={this.onRepoDetails}
                  onRepoClick={this.onRepoClick}
                  sortRepoList={this.sortRepoList}
                />
              }
            </div>
          </div>
          {this.state.isShowDetails && (
            <div className="cur-view-detail">
              <LibDetail 
                currentRepo={this.state.currentRepo}
                closeDetails={this.closeDetails}
              />
            </div>
          )}
        </div>
      </Fragment>
    );
  }
}

export default MyLibraries;
