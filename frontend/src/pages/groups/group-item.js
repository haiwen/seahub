import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import SharedRepoListView from '../../components/shared-repo-list-view/shared-repo-list-view';

import '../../css/groups.css';

const propTypes = {
  group: PropTypes.object.isRequired,
  updateGroup: PropTypes.func.isRequired
};


class GroupItem extends React.Component {

  constructor(props) {
    super(props);
  }

  onItemUnshare = (repo) => {
    const { group } = this.props;
    seafileAPI.unshareRepoToGroup(repo.repo_id, group.id).then(() => {
      group.repos = group.repos.filter(item => {
        return item.repo_id !== repo.repo_id;
      });
      this.props.updateGroup(group);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onItemDelete = (repo) => {
    const { group } = this.props;
    group.repos = group.repos.filter(item => {
      return item.repo_id !== repo.repo_id;
    });
    this.props.updateGroup(group);
  };

  onItemRename = (repo, newName) => {
    let group = this.props.group;
    seafileAPI.renameGroupOwnedLibrary(group.id, repo.repo_id, newName).then(res => {
      const { group } = this.props;
      group.repos = group.repos.map(item => {
        if (item.repo_id === repo.repo_id) {
          item.repo_name = newName;
        }
        return item;
      });
      this.props.updateGroup(group);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onMonitorRepo = (repo, monitored) => {
    const { group } = this.props;
    group.repos = group.repos.map(item => {
      if (item.repo_id === repo.repo_id) {
        item.monitored = monitored;
      }
      return item;
    });
    this.props.updateGroup(group);
  };

  render() {
    const { group } = this.props;
    const emptyTip = <p className="group-item-empty-tip">{gettext('No libraries')}</p>;
    return (
      <div className="pb-3">
        <div className="d-flex justify-content-between mt-3 py-1 border-bottom">
          <h4 className="sf-heading m-0 ellipsis">
            <span className="sf3-font-group sf3-font nav-icon" aria-hidden="true"></span>
            <a href={`${siteRoot}group/${group.id}/`} title={group.name}>{group.name}</a>
          </h4>
        </div>
        {group.repos.length === 0 ?
          emptyTip :
          <SharedRepoListView
            theadHidden={true}
            isShowRepoOwner={false}
            currentGroup={this.props.group}
            repoList={group.repos}
            onItemUnshare={this.onItemUnshare}
            onItemDelete={this.onItemDelete}
            onItemRename={this.onItemRename}
            onMonitorRepo={this.onMonitorRepo}
          />
        }
      </div>
    );
  }
}

GroupItem.propTypes = propTypes;

export default GroupItem;
