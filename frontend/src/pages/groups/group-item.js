import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import GroupOperationMenu from './group-op-menu';

const propTypes = {
  inAllLibs: PropTypes.bool,
  currentViewMode: PropTypes.string,
  group: PropTypes.object.isRequired,
  onMonitorRepo: PropTypes.func,
  renameRelatedGroupsRepos: PropTypes.func,
  deleteRelatedGroupsRepos: PropTypes.func,
  addRepoToGroup: PropTypes.func,
  unshareRepoToGroup: PropTypes.func,
  onTransferRepo: PropTypes.func.isRequired,
  onGroupNameChanged: PropTypes.func.isRequired,
  onGroupTransfered: PropTypes.func.isRequired,
  onGroupDeleted: PropTypes.func.isRequired,
  onLeavingGroup: PropTypes.func.isRequired
};


class GroupItem extends React.Component {

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

  addNewRepo = (newRepo) => {
    const { group } = this.props;
    const { id: group_id } = group;
    this.props.addRepoToGroup({ repo: newRepo, group_id });
  };

  onGroupNameChanged = (newName) => {
    const { group } = this.props;
    this.props.onGroupNameChanged(newName, group.id);
  };

  onGroupDeleted = () => {
    const { group } = this.props;
    this.props.onGroupDeleted(group.id);
  };

  onLeavingGroup = () => {
    const { group } = this.props;
    this.props.onLeavingGroup(group.id);
  };

  render() {
    const { inAllLibs = false, group, currentViewMode = LIST_MODE } = this.props;
    const emptyTip = <p className={`libraries-empty-tip-in-${currentViewMode}-mode`}>{gettext('No libraries')}</p>;

    return (
      <div className="pb-3">
        <div className={`d-flex justify-content-between mt-3 py-1 ${currentViewMode == LIST_MODE ? 'sf-border-bottom' : ''}`}>
          <h4 className="sf-heading m-0 d-flex align-items-center">
            <span className={`${group.parent_group_id == 0 ? 'sf3-font-group' : 'sf3-font-department'} sf3-font nav-icon`} aria-hidden="true"></span>
            <a href={`${siteRoot}group/${group.id}/`} title={group.name} className="ellipsis">{group.name}</a>
            <GroupOperationMenu
              group={group}
              addNewRepo={this.addNewRepo}
              onGroupNameChanged={this.onGroupNameChanged}
              onGroupTransfered={this.props.onGroupTransfered}
              onGroupDeleted={this.onGroupDeleted}
              onLeavingGroup={this.onLeavingGroup}
            />
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
      </div>
    );
  }
}

GroupItem.propTypes = propTypes;

export default GroupItem;
