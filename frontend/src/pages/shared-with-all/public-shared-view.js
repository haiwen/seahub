import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, loginUrl } from '../../utils/constants';
import Repo from '../../models/repo';
import Loading from '../../components/loading';
import ModalPortal from '../../components/modal-portal';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';

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
      libraryType: 'public',
      isCreateRepoDialogShow: false,
    }
  }

  componentDidMount() {
    seafileAPI.listRepos({type: 'public'}).then((res) => {
      let repoList = res.data.repos.map(item => {
        let repo = new Repo(item);
        return repo;
      });
      this.setState({
        isLoading: false,
        repoList: repoList
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            isLoading: false,
            errMessage: gettext("Permission denied")
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            isLoading: false,
            errMessage: gettext("Error")
          });
        }
      } else {
        this.setState({
          isLoading: false,
          errMessage: gettext("Please check the network.")
        });
      }
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
      }
      let repo = new Repo(object);
      let repoList = this.addRepoItem(repo);
      this.setState({repoList: repoList});
      this.onCreateRepoToggle();
    }).catch(() => {
      // todo
    })
  }

  onItemUnshare = (repo) => {
    seafileAPI.unshareRepo(repo.repo_id, {share_type: 'public'}).then(() => {
      let repoList = this.state.repoList.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
      this.setState({repoList: repoList});
    });
  }

  onItemDelete = () => {
    // todo need to optimized
  }

  addRepoItem = (repo) => {
    let newRepoList = this.state.repoList.map(item => {return item;});
    newRepoList.push(repo);
    return newRepoList;
  }

  onCreateRepoToggle = () => {
    this.setState({isCreateRepoDialogShow: !this.state.isCreateRepoDialogShow});
  }

  render() {
    let errMessage = this.state.errMessage;
    let emptyTip = (
      <div className="empty-tip">
        <h2>{gettext('No public libraries')}</h2>
        <p>{gettext('You can create a public library by clicking the "New Library" button, others can view and download this library.')}</p>
      </div>
    );
    return (
      <Fragment>
        <div className="main-panel-north">
          <div className="cur-view-toolbar border-left-show">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
            <div className="operation">
              <button className="btn btn-secondary operation-item" title={gettext('New Library')} onClick={this.onCreateRepoToggle}>
                <i className="fas fa-plus-square op-icon"></i>
                {gettext('New Library')}
              </button>
            </div>
          </div>
          <CommonToolbar onSearchedClick={this.props.onSearchedClick} />
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
            <h3 className="sf-heading">{gettext("Shared with All")}</h3>
            </div>
            <div className="cur-view-content">
              {this.state.isLoading && <Loading />}
              {(!this.state.isLoading && errMessage) && errMessage}
              {(!this.state.isLoading && this.state.repoList.length === 0) && emptyTip}
              {(!this.state.isLoading && this.state.repoList.length > 0) &&
                <SharedRepoListView 
                  libraryType={this.state.libraryType}
                  repoList={this.state.repoList}
                  onItemUnshare={this.onItemUnshare}
                  onItemDelete={this.onItemDelete}
                />
              }
            </div>
          </div>
        </div>
        {this.state.isCreateRepoDialogShow && (
          <ModalPortal>
            <CreateRepoDialog 
              libraryType={this.state.libraryType}
              onCreateToggle={this.onCreateRepoToggle}
              onCreateRepo={this.onCreateRepo}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

PublicSharedView.propTypes = propTypes;

export default PublicSharedView;
