import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, username, canAddRepo } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import { Repo } from '../../models';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import GroupMembersDialog from '../../components/dialog/group-members-dialog';
import DismissGroupDialog from '../../components/dialog/dismiss-group-dialog';
import RenameGroupDialog from '../../components/dialog/rename-group-dialog';
import TransferGroupDialog from '../../components/dialog/transfer-group-dialog';
import ImportMembersDialog from '../../components/dialog/import-members-dialog';
import ManageMembersDialog from '../../components/dialog/manage-members-dialog';
import DepartmentDetailDialog from '../../components/dialog/department-detail-dialog';
import LeaveGroupDialog from '../../components/dialog/leave-group-dialog';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';

import '../../css/group-view.css';

const propTypes = {
  group: PropTypes.object.isRequired,
  addNewRepo: PropTypes.func.isRequired,
  onGroupNameChanged: PropTypes.func.isRequired,
  onGroupTransfered: PropTypes.func.isRequired,
  onGroupDeleted: PropTypes.func.isRequired,
  onLeavingGroup: PropTypes.func.isRequired
};

class GroupOperationMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isCreateRepoDialogOpen: false,
      isShowDepartmentDetailDialog: false,
      isRenameGroupDialogOpen: false,
      isDeleteGroupDialogOpen: false,
      isTransferGroupDialogOpen: false,
      isImportMembersDialogOpen: false,
      isManageMembersDialogOpen: false,
      isLeaveGroupDialogOpen: false,
      isMembersDialogOpen: false
    };
  }

  onCreateRepoToggle = () => {
    this.setState({ isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen });
  };

  onCreateRepo = (repo, groupType) => {
    const { group } = this.props;
    const groupId = group.id;
    if (groupType && groupType === 'department') {
      seafileAPI.createGroupOwnedLibrary(groupId, repo).then(res => {
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
        const repo = new Repo(object);
        this.props.addNewRepo(repo);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });

    } else {
      seafileAPI.createGroupRepo(groupId, repo).then(res => {
        const repo = new Repo(res.data);
        this.props.addNewRepo(repo);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
    this.onCreateRepoToggle();
  };

  toggleDeleteGroupDialog = () => {
    this.setState({
      isDeleteGroupDialogOpen: !this.state.isDeleteGroupDialogOpen,
    });
  };

  toggleRenameGroupDialog = () => {
    this.setState({
      isRenameGroupDialogOpen: !this.state.isRenameGroupDialogOpen,
    });
  };

  toggleTransferGroupDialog = () => {
    this.setState({
      isTransferGroupDialogOpen: !this.state.isTransferGroupDialogOpen,
    });
  };

  toggleImportMembersDialog = () => {
    this.setState({
      isImportMembersDialogOpen: !this.state.isImportMembersDialogOpen
    });
  };

  importMembersInBatch = (file) => {
    toaster.notify(gettext('It may take some time, please wait.'), { 'id': 'importing-members' });
    const { group } = this.props;
    seafileAPI.importGroupMembersViaFile(group.id, file).then((res) => {
      res.data.success.forEach(item => {
        toaster.success(gettext('Successfully imported {user_placeholder}').replace('{user_placeholder}', `${item.contact_email}`), { 'id': 'importing-members' });
      });
      res.data.failed.forEach(item => {
        toaster.danger(`${item.email}: ${item.error_msg}`, { 'id': 'importing-members' });
      });
    }).catch((error) => {
      let errMsg = Utils.getErrorMsg(error);
      toaster.danger(errMsg);
    });
  };

  toggleManageMembersDialog = () => {
    this.setState({
      isManageMembersDialogOpen: !this.state.isManageMembersDialogOpen,
    });
  };

  toggleLeaveGroupDialog = () => {
    this.setState({
      isLeaveGroupDialogOpen: !this.state.isLeaveGroupDialogOpen,
    });
  };

  toggleMembersDialog = () => {
    this.setState({
      isMembersDialogOpen: !this.state.isMembersDialogOpen
    });
  };

  toggleDepartmentDetailDialog = () => {
    this.setState({
      isShowDepartmentDetailDialog: !this.state.isShowDepartmentDetailDialog
    });
  };

  getOpList = () => {
    const { group } = this.props;
    const isDepartment = group.parent_group_id !== 0;
    const isStaff = group.admins.indexOf(username) > -1;
    const isOwner = group.owner === username;
    const opList = [];
    if ((!isDepartment && canAddRepo) ||
      (isDepartment && isStaff)) {
      this.newLibraryEnabled = true;
      opList.push({ 'text': gettext('New Library'), 'onClick': this.onCreateRepoToggle }, 'Divider');
    }
    opList.push({ 'text': gettext('Members'), 'onClick': this.toggleMembersDialog });
    if (isStaff || isOwner) {
      opList.push({ 'text': gettext('Import members'), 'onClick': this.toggleImportMembersDialog });
      opList.push({ 'text': gettext('Manage members'), 'onClick': this.toggleManageMembersDialog });
      opList.push('Divider');
      opList.push({ 'text': gettext('Rename'), 'onClick': this.toggleRenameGroupDialog });
      if (isOwner) {
        opList.push({ 'text': gettext('Transfer'), 'onClick': this.toggleTransferGroupDialog });
      }
      if (isOwner) {
        opList.push({ 'text': gettext('Delete group'), 'onClick': this.toggleDeleteGroupDialog });
      }
    }

    if (!isOwner && !isDepartment) {
      opList.push({ 'text': gettext('Leave group'), 'onClick': this.toggleLeaveGroupDialog });
    }

    return opList;
  };


  render() {
    const {
      isCreateRepoDialogOpen,
      isMembersDialogOpen
    } = this.state;
    const { group } = this.props;
    const { id: groupID, parent_group_id, owner } = group;
    const isDepartment = parent_group_id !== 0;
    const isOwner = owner === username;

    const opList = this.getOpList();
    return (
      <Fragment>
        {group && (
          <SingleDropdownToolbar
            withPlusIcon={this.newLibraryEnabled}
            opList={opList}
          />
        )}
        {isCreateRepoDialogOpen &&
          <CreateRepoDialog
            onCreateToggle={this.onCreateRepoToggle}
            onCreateRepo={this.onCreateRepo}
            libraryType={isDepartment ? 'department' : 'group'}
          />
        }
        {isMembersDialogOpen &&
          <GroupMembersDialog
            groupID={groupID}
            toggleDialog={this.toggleMembersDialog}
          />
        }
        {this.state.isRenameGroupDialogOpen &&
          <RenameGroupDialog
            groupID={groupID}
            groupName={group.name}
            onGroupNameChanged={this.props.onGroupNameChanged}
            toggleDialog={this.toggleRenameGroupDialog}
          />
        }
        {this.state.isDeleteGroupDialogOpen &&
          <DismissGroupDialog
            groupID={groupID}
            onGroupDeleted={this.props.onGroupDeleted}
            toggleDialog={this.toggleDeleteGroupDialog}
          />
        }
        {this.state.isTransferGroupDialogOpen &&
          <TransferGroupDialog
            groupID={groupID}
            onGroupTransfered={this.props.onGroupTransfered}
            toggleDialog={this.toggleTransferGroupDialog}
          />
        }
        {this.state.isImportMembersDialogOpen &&
          <ImportMembersDialog
            importMembersInBatch={this.importMembersInBatch}
            toggleDialog={this.toggleImportMembersDialog}
          />
        }
        {this.state.isManageMembersDialogOpen &&
          <ManageMembersDialog
            groupID={groupID}
            isOwner={isOwner}
            toggleManageMembersDialog={this.toggleManageMembersDialog}
            toggleDepartmentDetailDialog={this.toggleDepartmentDetailDialog}
          />
        }
        {this.state.isShowDepartmentDetailDialog &&
          <DepartmentDetailDialog
            usedFor='add_group_member'
            toggleDepartmentDetailDialog={this.toggleDepartmentDetailDialog}
            toggleManageMembersDialog={this.toggleManageMembersDialog}
            groupID={groupID}
            isOwner={isOwner}
          />
        }
        {this.state.isLeaveGroupDialogOpen &&
          <LeaveGroupDialog
            groupID={groupID}
            toggleDialog={this.toggleLeaveGroupDialog}
            onLeavingGroup={this.props.onLeavingGroup}
          />
        }
      </Fragment>
    );
  }
}

GroupOperationMenu.propTypes = propTypes;

export default GroupOperationMenu;
