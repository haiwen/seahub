import React,{ Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, username, loginUrl } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import Loading from '../../components/loading';
import ModalPortal from '../../components/modal-portal';
import Group from '../../models/group';
import RepoInfo from '../../models/repoInfo';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import CreateDepartmentRepoDialog from '../../components/dialog/create-department-repo-dialog';
import ShareRepoListView from '../../components/share-repo-list-view/share-repo-list-view';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

const DEPARETMENT_GROUP_ONWER_NAME = 'system admin';

class GroupView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errMessage: '',
      emptyTip: null,
      currentGroup: null,
      isStaff: false,
      repoList: [],
      libraryType: 'group',
      isCreateRepoDialogShow: false,
      isDepartmentGroup: false,
    }
  }

  componentDidMount() {
    let groupID = this.props.groupID;
    this.loadGroup(groupID);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.groupID !== this.props.groupID) {
      this.loadGroup(nextProps.groupID);
    }
  }

  loadGroup = (groupID) => {
    seafileAPI.getGroup(groupID).then((res) => {
      let currentGroup = new Group(res.data);
      let emptyTip = this.getEmptyTip(currentGroup);
      let isStaff  = currentGroup.admins.indexOf(username) > -1;  //for item operations
      let isDepartmentGroup = currentGroup.owner === DEPARETMENT_GROUP_ONWER_NAME;
      this.setState({
        emptyTip: emptyTip,
        currentGroup: currentGroup,
        isStaff: isStaff,
        isDepartmentGroup: isDepartmentGroup,
      });
      this.loadRepos(groupID);
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

  loadRepos = (groupID) => {
    this.setState({isLoading: true});
    seafileAPI.listGroupRepos(groupID).then((res) => {
      let repoList = res.data.map(item => {
        let repoInfo = new RepoInfo(item);
        return repoInfo;
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

  getEmptyTip = (currentGroup) => {
    let emptyTip = null;
    if (currentGroup) {
      if (currentGroup.parent_group_id === 0) {
        emptyTip = (
          <div className="empty-tip">
            <h2>{gettext('No library is shared to this group')}</h2>
            <p>{gettext('You can share libraries by clicking the "New Library" button above or the "Share" icon on your libraries list.')}</p>
            <p>{gettext('Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.')}</p>
          </div>
        );
      } else {
        if (currentGroup.admins.indexOf(username) == -1) {  // is a member of this group
          emptyTip = (
            <div className="empty-tip">
              <h2>{gettext('No libraries')}</h2>
            </div>
          );
        } else {
          emptyTip = (
            <div className="empty-tip">
              <h2>{gettext('No libraries')}</h2>
              <p>{gettext('You can create libraries by clicking the "New Library" button above.')}</p>
            </div>
          );
        }
      }
    }
    return emptyTip;
  }

  onCreateRepoToggle = () => {
    this.setState({isCreateRepoDialogShow: !this.state.isCreateRepoDialogShow});
  }

  onCreateRepo = (repo) => {
    let groupId = this.props.groupID;
    seafileAPI.createGroupRepo(groupId, repo).then(res => {
      let repo = new RepoInfo(res.data);
      let repoList = this.addRepoItem(repo);
      this.setState({repoList: repoList});
    }).catch(() => {
      //todo
    });
    this.onCreateRepoToggle();
  }

  addRepoItem = (repo) => {
    let newRepoList = this.state.repoList.map(item => {return item;});
    newRepoList.push(repo);
    return newRepoList;
  }

  onItemUnshared = (repo) => {
    let group = this.state.currentGroup;
    seafileAPI.unshareRepo(repo.repo_id, {share_type: 'group', group_id: group.id}).then(() => {
      let repoList = this.state.repoList.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
      this.setState({repoList: repoList});
    });
  }

  render() {
    let { errMessage, emptyTip, currentGroup } = this.state;
    let isShowSettingIcon = !(currentGroup && currentGroup.parent_group_id !== 0 && currentGroup.admins.indexOf(username) === -1);
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
              {currentGroup && (
                <Fragment>
                  <div className="path-container">
                    <a href={`${siteRoot}groups/`}>{gettext("Groups")}</a>
                    <span className="path-split">/</span>
                    <span>{currentGroup.name}</span>
                    {currentGroup.parent_group_id !== 0 && (
                      <span className="address-book-group-icon icon-building" title={gettext("This is a special group representing a department.")}></span>
                    )}
                  </div>
                  <div className="path-tool">
                    {isShowSettingIcon && (
                      <a href="#" className="sf2-icon-cog1 op-icon group-top-op-icon" title={gettext("Settings")} aria-label={gettext("Settings")}></a>
                    )}
                    <a href="#" className="sf2-icon-user2 op-icon group-top-op-icon" title={gettext("Members")} aria-label={gettext("Members")}></a>
                  </div>
                </Fragment>
              )}
            </div>
            <div className="cur-view-content">
              {this.state.isLoading && <Loading />}
              {(!this.state.isLoading && errMessage) && errMessage}
              {(!this.state.isLoading && this.state.repoList.length === 0) && emptyTip}
              {(!this.state.isLoading && this.state.repoList.length > 0) &&
                <ShareRepoListView 
                  repoList={this.state.repoList} 
                  currentGroup={this.state.currentGroup} 
                  onItemUnshared={this.onItemUnshared}
                />
              }
            </div>
          </div>
        </div>
        {this.state.isCreateRepoDialogShow && !this.state.isDepartmentGroup && (
          <ModalPortal>
            <CreateRepoDialog 
              hasPermission={this.hasPermission}
              libraryType={this.state.libraryType}
              onCreateToggle={this.onCreateRepoToggle}
              onCreateRepo={this.onCreateRepo}
            />
          </ModalPortal>
        )}
        {this.state.isCreateRepoDialogShow && this.state.isDepartmentGroup &&
          <CreateDepartmentRepoDialog 
            isAdmin={this.state.isAdmin}
            onCreateToggle={this.onCreateRepoToggle}
            onCreateRepo={this.onCreateRepo}
          />
        }
      </Fragment>
    );
  }
}

GroupView.propTypes = propTypes;

export default GroupView;
