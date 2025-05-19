import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, InputGroup, InputGroupText, Input } from 'reactstrap';
import { Utils } from '../utils/utils';
import { gettext, cloudMode, isOrgContext } from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import UserSelect from './user-select';
import toaster from './toast';
import Loading from './loading';
import GroupMembers from './group-members';

const propTypes = {
  toggleManageMembersDialog: PropTypes.func,
  toggleDepartmentDetailDialog: PropTypes.func,
  groupID: PropTypes.number.isRequired,
  isOwner: PropTypes.bool.isRequired
};

class ManageMembersDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      enableSelectMembersFromDept: false,
      isLoading: true, // first loading
      isLoadingMore: false,
      groupMembers: [],
      page: 1,
      perPage: 100,
      hasNextPage: false,
      selectedUsers: [],
      errMessage: [],
      isItemFreezed: false,
      searchActive: false,
      keyword: '',
      membersFound: []
    };
  }

  componentDidMount() {
    this.getPermForSelectMembersFromDept();
    this.listGroupMembers(this.state.page);
  }

  listGroupMembers = (page) => {
    const { groupID } = this.props;
    const { perPage, groupMembers } = this.state;
    seafileAPI.listGroupMembers(groupID, page, perPage).then((res) => {
      const members = res.data;
      this.setState({
        isLoading: false,
        isLoadingMore: false,
        page: page,
        hasNextPage: members.length < perPage ? false : true,
        groupMembers: groupMembers.concat(members)
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({
        isLoading: false,
        isLoadingMore: false,
        hasNextPage: false
      });
    });
  };

  onSelectChange = (option) => {
    this.setState({
      selectedUsers: option,
      errMessage: [],
    });
  };

  addGroupMember = () => {
    let emails = [];
    for (let i = 0; i < this.state.selectedUsers.length; i++) {
      emails.push(this.state.selectedUsers[i].email);
    }
    seafileAPI.addGroupMembers(this.props.groupID, emails).then((res) => {
      const newMembers = res.data.success;
      this.setState({
        groupMembers: [].concat(newMembers, this.state.groupMembers),
        selectedUsers: [],
      });
      if (res.data.failed.length > 0) {
        this.setState({
          errMessage: res.data.failed
        });
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleItemFreezed = (isFreezed) => {
    this.setState({
      isItemFreezed: isFreezed
    });
  };

  handleScroll = (event) => {
    // isLoadingMore: to avoid repeated request
    const { page, hasNextPage, isLoadingMore } = this.state;
    if (hasNextPage && !isLoadingMore) {
      const clientHeight = event.target.clientHeight;
      const scrollHeight = event.target.scrollHeight;
      const scrollTop = event.target.scrollTop;
      const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
      if (isBottom) { // scroll to the bottom
        this.setState({ isLoadingMore: true }, () => {
          this.listGroupMembers(page + 1);
        });
      }
    }
  };

  changeMember = (targetMember) => {
    this.setState({
      groupMembers: this.state.groupMembers.map((item) => {
        if (item.email == targetMember.email) {
          item = targetMember;
        }
        return item;
      })
    });
  };

  deleteMember = (targetMember) => {
    const groupMembers = this.state.groupMembers;
    groupMembers.splice(groupMembers.indexOf(targetMember), 1);
    this.setState({
      groupMembers: groupMembers
    });
  };

  searchMembers = (e) => {
    const { groupMembers } = this.state;
    const keyword = e.target.value;
    const value = keyword.trim().toLowerCase();
    const membersFound = groupMembers.filter(item => item.name.toLowerCase().indexOf(value) > -1);
    this.setState({ keyword, membersFound });
  };

  clearSearch = () => {
    this.setState({
      keyword: '',
      membersFound: []
    });
  };

  onSearchInputFocus = () => {
    this.setState({
      searchActive: true
    });
  };

  onSearchInputBlur = () => {
    this.setState({
      searchActive: false
    });
  };

  onClickDeptBtn = () => {
    this.props.toggleDepartmentDetailDialog();
  };

  getPermForSelectMembersFromDept = () => {
    if (window.app.config.lang !== 'zh-cn') {
      this.setState({
        enableSelectMembersFromDept: false
      });
      return;
    }

    if (cloudMode && !isOrgContext) {
      this.setState({
        enableSelectMembersFromDept: false
      });
      return;
    }

    seafileAPI.listAddressBookDepartments().then((res) => {
      this.setState({
        enableSelectMembersFromDept: res.data.departments.length > 0
      });
    }).catch(error => {
      this.setState({
        enableSelectMembersFromDept: false
      });
    });
  };


  render() {
    const {
      enableSelectMembersFromDept,
      isLoading, hasNextPage, groupMembers,
      keyword, membersFound,
      searchActive
    } = this.state;

    return (
      <Fragment>
        <p className="mb-2">{gettext('Add group member')}</p>
        <div className='add-members'>
          <UserSelect
            placeholder={gettext('Search users')}
            onSelectChange={this.onSelectChange}
            selectedUsers={this.state.selectedUsers}
            isMulti={true}
            className="add-members-select"
          />
          {enableSelectMembersFromDept &&
            <span onClick={this.onClickDeptBtn} className="sf3-font sf3-font-invite-visitors toggle-detail-btn"></span>
          }
          {this.state.selectedUsers.length > 0 ?
            <Button color="primary" onClick={this.addGroupMember}>{gettext('Submit')}</Button> :
            <Button color="primary" disabled>{gettext('Submit')}</Button>
          }
        </div>
        {
          this.state.errMessage.length > 0 &&
            this.state.errMessage.map((item, index = 0) => {
              return (
                <div className="group-error error" key={index}>{item.error_msg}</div>
              );
            })
        }
        {groupMembers.length > 10 &&
          <InputGroup className={`search-group-members rounded ${searchActive ? 'active' : ''}`}>
            <InputGroupText>
              <i className="sf3-font sf3-font-search" aria-hidden={true}></i>
            </InputGroupText>
            <Input
              type="text"
              className="input-group-input px-0"
              placeholder={gettext('Search group members')}
              value={keyword}
              onChange={this.searchMembers}
              onFocus={this.onSearchInputFocus}
              onBlur={this.onSearchInputBlur}
            />
            {keyword && (
              <InputGroupText>
                <i className="sf2-icon-x1" aria-hidden={true} onClick={this.clearSearch}></i>
              </InputGroupText>
            )}
          </InputGroup>
        }
        <div className="manage-members" onScroll={keyword.trim() ? () => {} : this.handleScroll}>
          {isLoading ? <Loading /> : (
            <Fragment>
              <GroupMembers
                groupMembers={keyword.trim() ? membersFound : groupMembers}
                changeMember={this.changeMember}
                deleteMember={this.deleteMember}
                groupID={this.props.groupID}
                isOwner={this.props.isOwner}
                isItemFreezed={this.state.isItemFreezed}
                toggleItemFreezed={this.toggleItemFreezed}
              />
              {(!keyword.trim() && hasNextPage) && <Loading />}
            </Fragment>
          )}
        </div>
      </Fragment>
    );
  }
}

ManageMembersDialog.propTypes = propTypes;

export default ManageMembersDialog;
