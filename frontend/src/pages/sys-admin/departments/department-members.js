import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Paginator from '../../../components/paginator';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils.js';
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
      isItemFreezed: false,
      members: [],
      membersErrorMsg: '',
      currentPageInfo: {
      },
      currentPage: 1,
      perPage: 25,
      deletedMember: {},
      showDeleteMemberDialog: false
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      const { groupID } = this.props;
      this.listMembers(groupID, this.state.currentPage, this.state.perPage);
    });
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.groupID !== nextProps.groupID) {
      this.listMembers(nextProps.groupID, this.state.currentPage, this.state.perPage);
    }
  }

  listMembers = (groupID, page, perPage) => {
    seafileAPI.sysAdminListGroupMembers(groupID, page, perPage).then((res) => {
      this.setState({
        members: res.data.members,
        currentPageInfo: res.data.page_info
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      this.setState({membersErrorMsg: errMessage});
    });
  }

  getPreviousPageList = () => {
    this.listMembers(this.props.groupID, this.state.currentPageInfo.current_page - 1, this.state.perPage);
  }

  getNextPageList = () => {
    this.listMembers(this.props.groupID, this.state.currentPageInfo.current_page + 1, this.state.perPage);
  }

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
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
    this.listMembers(this.props.groupID, this.state.currentPageInfo.current_page, this.state.perPage);
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
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
    const { groupID } = this.props;

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
                  {this.state.currentPageInfo &&
                  <Paginator
                    gotoPreviousPage={this.getPreviousPageList}
                    gotoNextPage={this.getNextPageList}
                    currentPage={this.state.currentPageInfo.current_page}
                    hasNextPage={this.state.currentPageInfo.has_next_page}
                    curPerPage={this.state.perPage}
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
