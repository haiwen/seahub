import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import GroupsNav from './groups-nav';
import MainPanelTopbar from '../main-panel-topbar';
import CommonOperationDialog from '../../../components/dialog/common-operation-dialog';
import SysAdminGroupTransferDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-group-transfer-dialog';
import SysAdminCreateGroupDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-create-group-dialog';
import Paginator from '../../../components/paginator';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.pageInfo.current_page - 1);
  }

  getNextPage = () => {
    this.props.getListByPage(this.props.pageInfo.current_page + 1);
  }

  render() {
    const { loading, errorMsg, items, pageInfo } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No groups')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="30%">{gettext('Name')}</th>
                <th width="40%">{gettext('Owner')}</th>
                <th width="20%">{gettext('Created At')}</th>
                <th width="10%">{/* operation */}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  deleteGroup={this.props.deleteGroup}
                  transferGroup={this.props.transferGroup}
                />);
              })}
            </tbody>
          </table>
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
            currentPage={pageInfo.current_page}
            hasNextPage={pageInfo.has_next_page}
            canResetPerPage={false}
          />
        </Fragment>
      );
      return items.length ? table : emptyTip; 
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      isDeleteDialogOpen: false,
      isTransferDialogOpen: false,
    };
  }

  handleMouseEnter = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseLeave = () => {
    this.setState({isOpIconShown: false});
  }

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  toggleTransferDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isTransferDialogOpen: !this.state.isTransferDialogOpen});
  }

  deleteGroup = () => {
    this.props.deleteGroup(this.props.item.id);
    this.toggleDeleteDialog();
  }

  transferGroup = (receiver) => {
    this.props.transferGroup(receiver.email, this.props.item.id);
    this.toggleTransferDialog();
  }

  render() {
    let { isOpIconShown, isDeleteDialogOpen, isTransferDialogOpen } = this.state;
    let { item } = this.props;

    let iconVisibility = isOpIconShown ? '' : ' invisible'; 
    let deleteIconClassName = 'op-icon sf2-icon-delete' + iconVisibility;
    let transferIconClassName = 'op-icon sf2-icon-move' + iconVisibility;

    let groupName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', groupName);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><a href={siteRoot + 'sys/groups/' + item.id + '/libs/'}>{item.name}</a></td>
          <td><a href={siteRoot + 'sys/user-info/' + item.owner + '/'}>{item.owner_name}</a></td>
          <td>
            <span className="item-meta-info" title={moment(item.created_at).format('llll')}>{moment(item.created_at).fromNow()}</span>
          </td>
          <td>
            <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
            <a href="#" className={transferIconClassName} title={gettext('Transfer')} onClick={this.toggleTransferDialog}></a>
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete Group')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteDialog}
            executeOperation={this.deleteGroup}
            confirmBtnText={gettext('Delete')}
          />
        }
        {isTransferDialogOpen &&
          <SysAdminGroupTransferDialog
            groupName={item.name}
            toggle={this.toggleTransferDialog}
            submit={this.transferGroup}
          />
        }
      </Fragment>
    );
  }
}

class Groups extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      groupList: [],
      pageInfo: {},
      perPage: 100,
      isCreateGroupDialogOpen: false,
    };
  }

  componentDidMount () {
    this.getGroupListByPage(1);
  }

  toggleCreateGroupDialog = () => {
    this.setState({isCreateGroupDialogOpen: !this.state.isCreateGroupDialogOpen});
  }

  getGroupListByPage = (page) => {
    seafileAPI.sysAdminListAllGroups(page, this.state.perPage).then((res) => {
      this.setState({
        loading: false,
        groupList: res.data.groups,
        pageInfo: res.data.page_info
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  createGroup = (groupName, OnwerEmail) => {
    seafileAPI.sysAdminCreateNewGroup(groupName, OnwerEmail).then(res => {
      let newGroupList = this.state.groupList;
      newGroupList.unshift(res.data);
      this.setState({
        groupList: newGroupList
      });
      this.toggleCreateGroupDialog();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteGroup = (groupID) => {
    seafileAPI.sysAdminDismissGroupByID(groupID).then(res => {
      let newGroupList = this.state.groupList.filter(item => {
        return item.id != groupID;
      });
      this.setState({
        groupList: newGroupList
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  transferGroup = (receiverEmail, groupID) => {
    seafileAPI.sysAdminTransferGroup(receiverEmail, groupID).then(res => {
      let newGroupList = this.state.groupList.map(item => {
        if (item.id == groupID) {
          item = res.data;
        }
        return item;
      });
      this.setState({
        groupList: newGroupList
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let { isCreateGroupDialogOpen } = this.state;

    return (
      <Fragment>
        <MainPanelTopbar>
          <Fragment>
            <Button className="operation-item" onClick={this.toggleCreateGroupDialog}>{gettext('New Group')}</Button>
            <Button className="btn btn-secondary operation-item" ><a href={siteRoot+'sys/groupadmin/export-excel/'}>{gettext('Export Excel')}</a></Button>
          </Fragment>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <GroupsNav currentItem="groups" />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.groupList}
                pageInfo={this.state.pageInfo}
                deleteGroup={this.deleteGroup}
                transferGroup={this.transferGroup}
                getListByPage={this.getGroupListByPage}
              />
            </div>
          </div>
        </div>
        {isCreateGroupDialogOpen &&
          <SysAdminCreateGroupDialog 
            createGroupDialogToggle={this.toggleCreateGroupDialog}
            createGroup={this.createGroup}
          />
        }
      </Fragment>
    );
  }
}

export default Groups;
