import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@reach/router';
import Paginator from '../../../components/paginator';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils.js';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import ModalPortal from '../../../components/modal-portal';
import AddDepartDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-department-dialog';
import AddMemberDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-member-dialog';
import DeleteMemberDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-member-dialog';
import AddRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-repo-dialog';
import DeleteRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-repo-dialog';
import DeleteDepartDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-department-dialog';
import SetGroupQuotaDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-set-group-quota-dialog';
import { siteRoot, gettext, lang } from '../../../utils/constants';
import GroupItem from './group-item';
import MemberItem from './member-item';
import RepoItem from './repo-item';
import '../../../css/org-department-item.css';

moment.locale(lang);

const DepartmentDetailPropTypes = {
  groupID: PropTypes.string,
};

class DepartmentDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groupName: '',
      isItemFreezed: false,
      ancestorGroups: [],
      members: [],
      membersErrorMsg: '',
      membersPageInfo: {
      },
      membersPage: 1,
      membersPerPage: 25,
      deletedMember: {},
      isShowAddMemberDialog: false,
      showDeleteMemberDialog: false,
      repos: [],
      deletedRepo: {},
      isShowAddRepoDialog: false,
      showDeleteRepoDialog: false,
      groups: [],
      subGroupID: '',
      subGroupName: '',
      isShowAddDepartDialog: false,
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
    };
  }

  componentDidMount() {
    const groupID = this.props.groupID;
    this.listGroupRepo(groupID);
    this.getDepartmentInfo(groupID);
    this.listMembers(groupID, this.state.membersPage, this.state.membersPerPage);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.groupID !== nextProps.groupID) {
      this.listGroupRepo(nextProps.groupID);
      this.getDepartmentInfo(nextProps.groupID);
      this.listMembers(nextProps.groupID, this.state.membersPage, this.state.membersPerPage);
    }
  }

  listGroupRepo = (groupID) => {
    seafileAPI.sysAdminListGroupRepos(groupID).then(res => {
      this.setState({ repos: res.data.libraries });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  getDepartmentInfo = (groupID) => {
    seafileAPI.sysAdminGetDepartmentInfo(groupID, true).then(res => {
      this.setState({
        groups: res.data.groups,
        ancestorGroups: res.data.ancestor_groups,
        groupName: res.data.name,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  listMembers = (groupID, page, perPage) => {
    seafileAPI.sysAdminListGroupMembers(groupID, page, perPage).then((res) => {
      this.setState({
        members: res.data.members,
        membersPageInfo: res.data.page_info
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      this.setState({membersErrorMsg: errMessage});
    });
  }

  getPreviousPageList = () => {
    this.listMembers(this.props.groupID, this.state.membersPageInfo.current_page - 1, this.state.membersPerPage);
  }

  getNextPageList = () => {
    this.listMembers(this.props.groupID, this.state.membersPageInfo.current_page + 1, this.state.membersPerPage);
  }

  resetPerPage = (perPage) => {
    this.setState({
      membersPerPage: perPage
    }, () => {
      this.listMembers(this.props.groupID, 1, perPage);
    });
  }

  listSubDepartGroups = (groupID) => {
    seafileAPI.sysAdminGetDepartmentInfo(groupID, true).then(res => {
      this.setState({ groups: res.data.groups });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleCancel = () => {
    this.setState({
      showDeleteMemberDialog: false,
      showDeleteRepoDialog: false,
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
    });
  }

  onSubDepartChanged = () => {
    this.listSubDepartGroups(this.props.groupID);
  }

  onRepoChanged = () => {
    this.listGroupRepo(this.props.groupID);
  }

  onMemberChanged = () => {
    this.listMembers(this.props.groupID, this.state.membersPageInfo.current_page, this.state.membersPerPage);
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
  }

  showDeleteMemberDialog = (member) => {
    this.setState({ showDeleteMemberDialog: true, deletedMember: member });
  }

  showDeleteRepoDialog = (repo) => {
    this.setState({ showDeleteRepoDialog: true, deletedRepo: repo });
  }

  toggleAddRepoDialog = () => {
    this.setState({ isShowAddRepoDialog: !this.state.isShowAddRepoDialog });
  }

  toggleAddMemberDialog = () => {
    this.setState({ isShowAddMemberDialog: !this.state.isShowAddMemberDialog });
  }

  toggleAddDepartDialog = () => {
    this.setState({ isShowAddDepartDialog: !this.state.isShowAddDepartDialog});
  }

  showDeleteDepartDialog = (subGroup) => {
    this.setState({
      showDeleteDepartDialog: true,
      subGroupID: subGroup.id,
      subGroupName: subGroup.name
    });
  }

  showSetGroupQuotaDialog = (subGroupID) => {
    this.setState({
      showSetGroupQuotaDialog: true,
      subGroupID: subGroupID
    });
  }

  render() {
    const { members, membersErrorMsg, repos, groups } = this.state;
    const groupID = this.props.groupID;
    const topBtn = 'btn btn-secondary operation-item';
    const topbarChildren = (
      <Fragment>
        {groupID &&
          <Fragment>
            <button className={topBtn} title={gettext('New Sub-department')} onClick={this.toggleAddDepartDialog}>{gettext('New Sub-department')}</button>
            <button className={topBtn} title={gettext('Add Member')} onClick={this.toggleAddMemberDialog}>{gettext('Add Member')}</button>
            <button className={topBtn} onClick={this.toggleAddRepoDialog} title={gettext('New Library')}>{gettext('New Library')}</button>
          </Fragment>
        }
        {this.state.isShowAddMemberDialog && (
          <ModalPortal>
            <AddMemberDialog
              toggle={this.toggleAddMemberDialog}
              onMemberChanged={this.onMemberChanged}
              groupID={groupID}
            />
          </ModalPortal>
        )}
        {this.state.isShowAddRepoDialog && (
          <ModalPortal>
            <AddRepoDialog
              toggle={this.toggleAddRepoDialog}
              onRepoChanged={this.onRepoChanged}
              groupID={groupID}
            />
          </ModalPortal>
        )}
        {this.state.isShowAddDepartDialog && (
          <ModalPortal>
            <AddDepartDialog
              onDepartChanged={this.onSubDepartChanged}
              parentGroupID={groupID}
              toggle={this.toggleAddDepartDialog}
            />
          </ModalPortal>
        )}
      </Fragment>
    );

    return (
      <Fragment>
        <MainPanelTopbar children={topbarChildren} />
        <div className="main-panel-center flex-row h-100">
          <div className="cur-view-container o-auto">
            <div className="cur-view-path">
              <div className="fleft">
                <h3 className="sf-heading">
                  {groupID ?
                    <Link to={siteRoot + 'sys/departments/'}>{gettext('Departments')}</Link>
                    : <span>{gettext('Departments')}</span>
                  }
                  {this.state.ancestorGroups.map(ancestor => {
                    let newHref = siteRoot + 'sys/departments/' + ancestor.id + '/';
                    return <span key={ancestor.id}>{' / '}<Link to={newHref}>{ancestor.name}</Link></span>;
                  })}
                  {groupID && <span>{' / '}{this.state.groupName}</span>}
                </h3>
              </div>
            </div>

            <div className="cur-view-subcontainer org-groups">
              <div className="cur-view-path">
                <div className="fleft"><h3 className="sf-heading">{gettext('Sub-departments')}</h3></div>
              </div>
              <div className="cur-view-content">
                {groups && groups.length > 0 ?
                  <table>
                    <thead>
                      <tr>
                        <th width="40%">{gettext('Name')}</th>
                        <th width="25%">{gettext('Created At')}</th>
                        <th width="20%">{gettext('Quota')}</th>
                        <th width="15%"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group, index) => {
                        return(
                          <Fragment key={group.id}>
                            <GroupItem
                              group={group}
                              showDeleteDepartDialog={this.showDeleteDepartDialog}
                              showSetGroupQuotaDialog={this.showSetGroupQuotaDialog}
                            />
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  : <p className="no-group">{gettext('No sub-departments')}</p>
                }
              </div>
            </div>

            <div className="cur-view-subcontainer org-members">
              <div className="cur-view-path">
                <div className="fleft"><h3 className="sf-heading">{gettext('Members')}</h3></div>
              </div>
              <div className="cur-view-content">
                {membersErrorMsg ? <p className="error text-center">{membersErrorMsg}</p> :
                  members.length == 0 ?
                  <p className="no-member">{gettext('No members')}</p> :
                  <Fragment>
                  <table>
                    <thead>
                      <tr>
                        <th width="5%"></th>
                        <th width="50%">{gettext('Name')}</th>
                        <th width="15%">{gettext('Role')}</th>
                        <th width="30%"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member, index) => {
                        return (
                          <Fragment key={index}>
                            <MemberItem
                              member={member}
                              showDeleteMemberDialog={this.showDeleteMemberDialog}
                              isItemFreezed={this.state.isItemFreezed}
                              onMemberChanged={this.onMemberChanged}
                              toggleItemFreezed={this.toggleItemFreezed}
                              groupID={groupID}
                            />
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  {this.state.membersPageInfo &&
                  <Paginator
                    gotoPreviousPage={this.getPreviousPageList}
                    gotoNextPage={this.getNextPageList}
                    currentPage={this.state.membersPageInfo.current_page}
                    hasNextPage={this.state.membersPageInfo.has_next_page}
                    curPerPage={this.state.membersPerPage}
                    resetPerPage={this.resetPerPage}
                  />
                  }
                  </Fragment>
                }
              </div>
            </div>

            <div className="cur-view-subcontainer org-libriries">
              <div className="cur-view-path">
                <div className="fleft"><h3 className="sf-heading">{gettext('Libraries')}</h3></div>
              </div>
              { repos.length > 0 ?
                <div className="cur-view-content">
                  <table>
                    <thead>
                      <tr>
                        <th width="5%"></th>
                        <th width="50%">{gettext('Name')}</th>
                        <th width="30%">{gettext('Size')}</th>
                        <th width="15%"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {repos.map((repo, index) => {
                        return(
                          <Fragment key={index}>
                            <RepoItem repo={repo} showDeleteRepoDialog={this.showDeleteRepoDialog}/>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                : <p className="no-libraty">{gettext('No libraries')}</p>
              }
            </div>

          </div>
          {this.state.showDeleteMemberDialog && (
            <ModalPortal>
              <DeleteMemberDialog
                toggle={this.toggleCancel}
                onMemberChanged={this.onMemberChanged}
                member={this.state.deletedMember}
                groupID={groupID}
              />
            </ModalPortal>
          )}
          {this.state.showDeleteRepoDialog && (
            <ModalPortal>
              <DeleteRepoDialog
                toggle={this.toggleCancel}
                onRepoChanged={this.onRepoChanged}
                repo={this.state.deletedRepo}
                groupID={groupID}
              />
            </ModalPortal>
          )}
          {this.state.showDeleteDepartDialog && (
            <ModalPortal>
              <DeleteDepartDialog
                toggle={this.toggleCancel}
                groupID={this.state.subGroupID}
                groupName={this.state.subGroupName}
                onDepartChanged={this.onSubDepartChanged}
              />
            </ModalPortal>
          )}
          {this.state.showSetGroupQuotaDialog && (
            <ModalPortal>
              <SetGroupQuotaDialog
                toggle={this.toggleCancel}
                groupID={this.state.subGroupID}
                onDepartChanged={this.onSubDepartChanged}
              />
            </ModalPortal>
          )}
        </div>
      </Fragment>
    );
  }
}

DepartmentDetail.propTypes = DepartmentDetailPropTypes;

export default DepartmentDetail;
