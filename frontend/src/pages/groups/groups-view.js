import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, loginUrl } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import Loading from '../../components/loading';
import Group from '../../models/group';
import Repo from '../../models/repo';
import GroupsToolbar from '../../components/toolbar/groups-toolbar';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';
import CreateGroupDialog from '../../components/dialog/create-group-dialog';
import LibDetail from '../../components/dirent-detail/lib-details';

import '../../css/groups.css';

const propTypes = {
  group: PropTypes.object.isRequired,
  onItemDetails: PropTypes.func.isRequired,
};


class RepoListViewPanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repoList: [],
    };
  }

  componentDidMount() {
    let group = this.props.group;
    let repoList = group.repos.map(item => {
      let repo = new Repo(item);
      return repo;
    });
    this.setState({repoList: repoList});
  }

  onItemUnshare = (repo) => {
    let group = this.props.group;
    seafileAPI.unshareRepo(repo.repo_id, {share_type: 'group', group_id: group.id}).then(() => {
      let repoList = this.state.repoList.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
      this.setState({repoList: repoList});
    });
  }

  onItemDelete = (repo) => {
    let group = this.props.group;
    seafileAPI.deleteGroupOwnedLibrary(group.id, repo.repo_id).then(() => {
      let repoList = this.state.repoList.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
      this.setState({repoList: repoList});
    }).catch(() => {
      // todo;
    });
  }
  
  onItemRename = (repo, newName) => {
    let group = this.props.group;
    seafileAPI.renameGroupOwnedLibrary(group.id, repo.repo_id, newName).then(res => {
      let repoList = this.state.repoList.map(item => {
        if (item.repo_id === repo.repo_id) {
          item.repo_name = newName;
        }
        return item;
      });
      this.setState({repoList: repoList});
    }).catch(() => {
      // todo
    });
  }

  render() {
    let group = this.props.group;
    const emptyTip = <p className="group-item-empty-tip">{gettext('No libraries')}</p>;
    return (
      <div className="group-list-panel">
        <h4 className="group-item-heading ellipsis">
          <a href={`${siteRoot}group/${group.id}/`} title={group.name}>{group.name}</a>
        </h4>
        {this.state.repoList.length === 0 ? 
          emptyTip :
          <SharedRepoListView 
            isShowTableThread={false}
            isShowRepoOwner={false} 
            currentGroup={this.props.group} 
            repoList={this.state.repoList}
            onItemUnshare={this.onItemUnshare}
            onItemDelete={this.onItemDelete}
            onItemDetails={this.props.onItemDetails}
            onItemRename={this.onItemRename}
          />
        }
      </div>
    );
  }
}

RepoListViewPanel.propTypes = propTypes;

class GroupsView extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      groupList: [],
      showAddGroupModal: false,
      isShowDetails: false,
      currentRepo: null,
    };
  }

  listGroups = () => {
    seafileAPI.listGroups(true).then((res) => {
      // `{'with_repos': 1}`: list repos of every group
      // res: {data: [...], status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      let groupList = res.data.map(item => {
        let group = new Group(item);
        return group;
      });
      this.setState({
        isLoading: false,
        groupList: groupList,
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

  toggleAddGroupModal = () => {
    this.setState({
      showAddGroupModal: !this.state.showAddGroupModal
    });
  }

  onCreateGroup = () => {
    this.setState({
      showAddGroupModal: false,
      isLoading: true,
      groupList: [],
    });
    this.listGroups();
  }

  componentDidMount() {
    this.listGroups();
  }

  onItemDetails = (repo) => {
    this.setState({
      isShowDetails: true,
      currentRepo: repo,
    });
  }

  closeDetails = () => {
    this.setState({isShowDetails: false});
  }

  render() {
    return (
      <Fragment>
        <GroupsToolbar
          onShowSidePanel={this.props.onShowSidePanel}
          onSearchedClick={this.props.onSearchedClick}
          toggleAddGroupModal={this.toggleAddGroupModal}
        />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('My Groups')}</h3>
            </div>
            <div className="cur-view-content cur-view-content-groups">
              {this.state.isLoading && <Loading />}
              {(!this.state.isLoading && this.state.errorMsg !== '') && this.state.errorMsg}
              {/* {(!this.state.isLoading && this.state.groupList.length === 0 ) && emptyTip} //todo */}
              {!this.state.isLoading && this.state.groupList.map((group, index) => {
                return (
                  <RepoListViewPanel 
                    key={index} 
                    group={group} 
                    onItemDetails={this.onItemDetails}
                  />
                );
              })}
            </div>
          </div>
          {this.state.isShowDetails && (
            <div className="cur-view-detail">
              <LibDetail currentRepo={this.state.currentRepo} closeDetails={this.closeDetails}/>
            </div>
          )}
        </div>
        { this.state.showAddGroupModal &&
          <CreateGroupDialog
            toggleAddGroupModal={this.toggleAddGroupModal}
            onCreateGroup={this.onCreateGroup}
            showAddGroupModal={this.state.showAddGroupModal}
          />
        }
      </Fragment>
    );
  }
}

const GroupsViewPropTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

GroupsView.propTypes = GroupsViewPropTypes;

export default GroupsView;
