import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Paginator from '../../../components/paginator';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils.js';
import toaster from '../../../components/toast';
import ModalPortal from '../../../components/modal-portal';
import DeleteMemberDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-member-dialog';
import { gettext, lang } from '../../../utils/constants';
import MemberItem from './member-item';
import Department from './department';
import '../../../css/org-department-item.css';

moment.locale(lang);

const DepartmentMembersPropTypes = {
  groupID: PropTypes.string,
};

class DepartmentMembers extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      orgID: '',
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
      showDeleteMemberDialog: false,
    };
  }

  componentDidMount() {
    const groupID = this.props.groupID;
    this.getDepartmentInfo(groupID);
    this.listMembers(groupID, this.state.membersPage, this.state.membersPerPage);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.groupID !== nextProps.groupID) {
      this.getDepartmentInfo(nextProps.groupID);
      this.listMembers(nextProps.groupID, this.state.membersPage, this.state.membersPerPage);
    }
  }

  getDepartmentInfo = (groupID) => {
    seafileAPI.sysAdminGetDepartmentInfo(groupID, true).then(res => {
      this.setState({
        groups: res.data.groups,
        ancestorGroups: res.data.ancestor_groups,
        groupName: res.data.name,
        orgID: res.data.org_id,
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

  toggleCancel = () => {
    this.setState({
      showDeleteMemberDialog: false,
    });
  }

  onMemberChanged = () => {
    this.listMembers(this.props.groupID, this.state.membersPageInfo.current_page, this.state.membersPerPage);
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  showDeleteMemberDialog = (member) => {
    this.setState({ showDeleteMemberDialog: true, deletedMember: member });
  }

  onAddNewMembers = (newMembers) => {
    const { members } = this.state;
    members.unshift(...newMembers);
    this.setState({ members });
  }

  render() {
    const { members, membersErrorMsg } = this.state;
    const groupID = this.props.groupID;

    return (
      <Fragment>
        <Department
          groupID={groupID}
          currentItem="members"
          onAddNewMembers={this.onAddNewMembers}
        >
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
                              orgID={this.state.orgID}
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
        </Department>
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
      </Fragment>
    );
  }
}

DepartmentMembers.propTypes = DepartmentMembersPropTypes;

export default DepartmentMembers;
