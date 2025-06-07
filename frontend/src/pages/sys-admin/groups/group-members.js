import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import SysAdminGroupAddMemberDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-group-add-member-dialog';
import RoleSelector from '../../../components/single-selector';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import GroupNav from './group-nav';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
  };

  getPreviousPageList = () => {
    this.props.getListByPage(this.props.pageInfo.current_page - 1);
  };

  getNextPageList = () => {
    this.props.getListByPage(this.props.pageInfo.current_page + 1);
  };

  render() {
    const { loading, errorMsg, items, pageInfo, curPerPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No members')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="5%">{/* icon */}</th>
                <th width="55%">{gettext('Name')}</th>
                <th width="30%">{gettext('Role')}</th>
                <th width="10%">{/* Operations*/}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (
                  <Item
                    key={index}
                    item={item}
                    isItemFreezed={this.state.isItemFreezed}
                    toggleItemFreezed={this.toggleItemFreezed}
                    removeMember={this.props.removeMember}
                    updateMemberRole={this.props.updateMemberRole}
                  />
                );
              })}
            </tbody>
          </table>
          {pageInfo &&
          <Paginator
            gotoPreviousPage={this.getPreviousPageList}
            gotoNextPage={this.getNextPageList}
            currentPage={pageInfo.current_page}
            hasNextPage={pageInfo.has_next_page}
            curPerPage={curPerPage}
            resetPerPage={this.props.resetPerPage}
          />
          }
        </Fragment>
      );
      return items.length ? table : emptyTip;
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  removeMember: PropTypes.func.isRequired,
  resetPerPage: PropTypes.func,
  updateMemberRole: PropTypes.func.isRequired,
  curPerPage: PropTypes.number,
  pageInfo: PropTypes.object,
  getListByPage: PropTypes.func.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.roleOptions = [
      { value: 'Admin', text: gettext('Admin'), isSelected: false },
      { value: 'Member', text: gettext('Member'), isSelected: false }
    ];
    this.state = {
      highlighted: false,
      isDeleteDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    if (this.props.isItemFreezed) return;
    this.setState({ highlighted: true });
  };

  handleMouseLeave = () => {
    if (this.props.isItemFreezed) return;
    this.setState({ highlighted: false });
  };

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({ isDeleteDialogOpen: !this.state.isDeleteDialogOpen });
  };

  removeMember = () => {
    const { item } = this.props;
    this.props.removeMember(item.email, item.name);
    this.toggleDeleteDialog();
  };

  updateMemberRole = (roleOption) => {
    this.props.updateMemberRole(this.props.item.email, roleOption.value);
  };

  render() {
    let { highlighted, isDeleteDialogOpen } = this.state;
    let { item } = this.props;

    let itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let dialogMsg = gettext('Are you sure you want to remove {placeholder} ?').replace('{placeholder}', itemName);

    const { role: curRole } = item;
    this.roleOptions = this.roleOptions.map(item => {
      item.isSelected = item.value == curRole;
      return item;
    });
    const currentSelectedOption = this.roleOptions.filter(item => item.isSelected)[0];

    return (
      <Fragment>
        <tr className={highlighted ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><img src={item.avatar_url} alt="" className="rounded-circle" width="24" /></td>
          <td><UserLink email={item.email} name={item.name} /></td>
          <td>
            {item.role == 'Owner' ?
              gettext('Owner') :
              <RoleSelector
                isDropdownToggleShown={highlighted}
                currentSelectedOption={currentSelectedOption}
                options={this.roleOptions}
                selectOption={this.updateMemberRole}
                toggleItemFreezed={this.props.toggleItemFreezed}
              />
            }
          </td>
          <td>
            {item.role != 'Owner' &&
            <i
              role="button"
              className={`op-icon sf2-icon-x3 ${highlighted ? '' : 'invisible'}`}
              title={gettext('Remove')}
              onClick={this.toggleDeleteDialog}
            >
            </i>
            }
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Remove Member')}
            message={dialogMsg}
            executeOperation={this.removeMember}
            confirmBtnText={gettext('Remove')}
            toggleDialog={this.toggleDeleteDialog}
          />
        }
      </Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  removeMember: PropTypes.func.isRequired,
  updateMemberRole: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  toggleItemFreezed: PropTypes.func.isRequired
};

class GroupMembers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      groupName: '',
      memberList: [],
      pageInfo: {},
      currentPage: 1,
      perPage: 100,
      isAddMemberDialogOpen: false
    };
  }

  componentDidMount() {

    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      currentPage: parseInt(urlParams.get('page') || currentPage),
      perPage: parseInt(urlParams.get('per_page') || perPage)
    }, () => {
      this.getListByPage(this.state.currentPage);
    });
  }

  getListByPage = (page) => {
    const { perPage } = this.state;
    systemAdminAPI.sysAdminListGroupMembers(this.props.groupID, page, perPage).then((res) => {
      this.setState({
        loading: false,
        memberList: res.data.members,
        groupName: res.data.group_name,
        pageInfo: res.data.page_info
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getListByPage(1);
    });
  };

  toggleAddMemberDialog = () => {
    this.setState({ isAddMemberDialogOpen: !this.state.isAddMemberDialogOpen });
  };

  addMembers = (emails) => {
    systemAdminAPI.sysAdminAddGroupMember(this.props.groupID, emails).then(res => {
      let newMemberList = res.data.success;
      if (newMemberList.length) {
        this.setState({
          memberList: newMemberList.concat(this.state.memberList)
        });
        newMemberList.forEach(item => {
          const msg = gettext('Successfully added {email_placeholder}')
            .replace('{email_placeholder}', item.email);
          toaster.success(msg);
        });
      }
      res.data.failed.forEach(item => {
        const msg = gettext('Failed to add {email_placeholder}: {error_msg_placeholder}')
          .replace('{email_placeholder}', item.email)
          .replace('{error_msg_placeholder}', item.error_msg);
        toaster.danger(msg, { duration: 3 });
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  removeMember = (email, name) => {
    systemAdminAPI.sysAdminDeleteGroupMember(this.props.groupID, email).then(res => {
      let newRepoList = this.state.memberList.filter(item => {
        return item.email != email;
      });
      this.setState({
        memberList: newRepoList
      });
      toaster.success(gettext('Successfully removed {placeholder}.').replace('{placeholder}', name));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateMemberRole = (email, role) => {
    let isAdmin = role == 'Admin';
    systemAdminAPI.sysAdminUpdateGroupMemberRole(this.props.groupID, email, isAdmin).then(res => {
      let newRepoList = this.state.memberList.map(item => {
        if (item.email == email) {
          item.role = role;
        }
        return item;
      });
      this.setState({
        memberList: newRepoList
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    let { isAddMemberDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddMemberDialog}>{gettext('Add Member')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <GroupNav
              currentItem="members"
              groupID={this.props.groupID}
              groupName={this.state.groupName}
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.memberList}
                removeMember={this.removeMember}
                updateMemberRole={this.updateMemberRole}
                pageInfo={this.state.pageInfo}
                curPerPage={this.state.perPage}
                getListByPage={this.getListByPage}
                resetPerPage={this.resetPerPage}
              />
            </div>
          </div>
        </div>
        {isAddMemberDialogOpen &&
          <SysAdminGroupAddMemberDialog
            addMembers={this.addMembers}
            toggle={this.toggleAddMemberDialog}
          />
        }
      </Fragment>
    );
  }
}

GroupMembers.propTypes = {
  groupID: PropTypes.string,
};

export default GroupMembers;
