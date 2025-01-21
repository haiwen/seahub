import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, username } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import Repo from '../../models/repo';
import { LIST_MODE } from '../../components/dir-view-mode/constants';

const propTypes = {
  inAllLibs: PropTypes.bool,
  currentViewMode: PropTypes.string,
  group: PropTypes.object.isRequired,
  onMonitorRepo: PropTypes.func,
  renameRelatedGroupsRepos: PropTypes.func,
  deleteRelatedGroupsRepos: PropTypes.func,
  insertRepoIntoGroup: PropTypes.func,
  unshareRepoToGroup: PropTypes.func,
  onTransferRepo: PropTypes.func.isRequired,
};


class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isCreateRepoDialogOpen: false
    };
  }

  onItemUnshare = (repo) => {
    const { group } = this.props;
    const { id: group_id } = group;
    seafileAPI.unshareRepoToGroup(repo.repo_id, group_id).then(() => {
      this.props.unshareRepoToGroup({ repo_id: repo.repo_id, group_id });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onItemDelete = (repo) => {
    this.props.deleteRelatedGroupsRepos(repo.repo_id);
  };

  onItemRename = (repo, newName) => {
    let group = this.props.group;
    seafileAPI.renameGroupOwnedLibrary(group.id, repo.repo_id, newName).then(res => {
      this.props.renameRelatedGroupsRepos(repo.repo_id, newName);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onMonitorRepo = (repo, monitored) => {
    this.props.onMonitorRepo(repo, monitored);
  };

  toggleCreateRepoDialog = () => {
    this.setState({
      isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen
    });
  };

  onCreateRepo = (repo) => {
    const { group } = this.props;
    const { id: group_id } = group;
    seafileAPI.createGroupOwnedLibrary(group_id, repo).then(res => {
      let object = {
        repo_id: res.data.id,
        repo_name: res.data.name,
        owner_name: res.data.group_name,
        owner_email: res.data.owner,
        permission: res.data.permission,
        mtime: res.data.mtime,
        size: res.data.size,
        encrypted: res.data.encrypted,
      };
      const newRepo = new Repo(object);
      this.props.insertRepoIntoGroup({ repo: newRepo, group_id });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.toggleCreateRepoDialog();
  };

  render() {
    const { inAllLibs = false, group, currentViewMode = LIST_MODE } = this.props;
    const { parent_group_id, admins } = group;
    const emptyTip = <p className={`libraries-empty-tip-in-${currentViewMode}-mode`}>{gettext('No libraries')}</p>;

    const isDeptAdmin = parent_group_id != 0 && admins.indexOf(username) > -1;
    return (
      <div className="pb-3">
        <div className={`d-flex justify-content-between mt-3 py-1 ${currentViewMode == LIST_MODE ? 'sf-border-bottom' : ''}`}>
          <h4 className="sf-heading m-0 d-flex align-items-center">
            <span className={`${group.parent_group_id == 0 ? 'sf3-font-group' : 'sf3-font-department'} sf3-font nav-icon`} aria-hidden="true"></span>
            <a href={`${siteRoot}group/${group.id}/`} title={group.name} className="ellipsis">{group.name}</a>
            {isDeptAdmin && (
              <SingleDropdownToolbar
                withPlusIcon={true}
                opList={[{ 'text': gettext('New Library'), 'onClick': this.toggleCreateRepoDialog }]}
              />
            )}
          </h4>
        </div>
        {group.repos.length === 0 ?
          emptyTip :
          <SharedRepoListView
            key={`group-${group.id}`}
            inAllLibs={inAllLibs}
            theadHidden={true}
            isShowRepoOwner={false}
            currentGroup={this.props.group}
            repoList={group.repos}
            onItemUnshare={this.onItemUnshare}
            onItemDelete={this.onItemDelete}
            onItemRename={this.onItemRename}
            onMonitorRepo={this.onMonitorRepo}
            onTransferRepo={this.props.onTransferRepo}
            currentViewMode={currentViewMode}
          />
        }
        {this.state.isCreateRepoDialogOpen &&
        <CreateRepoDialog
          onCreateToggle={this.toggleCreateRepoDialog}
          onCreateRepo={this.onCreateRepo}
          libraryType='department'
        />
        }
      </div>
    );
  }
}

GroupItem.propTypes = propTypes;

export default GroupItem;
