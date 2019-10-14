import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import EmptyTip from '../../../components/empty-tip';
import Paginator from '../../../components/paginator';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import SysAdminCreateGroupDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-create-group-dialog';
import SysAdminTransferGroupDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-group-transfer-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import OpMenu from './op-menu';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = { 
      isItemFreezed: false
    };  
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
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
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No groups')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="35%">{gettext('Name')}</th>
                <th width="40%">{gettext('Owner')}</th>
                <th width="20%">{gettext('Created At')}</th>
                <th width="5%">{/* operation */}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
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
      highlight: false,
      isDeleteDialogOpen: false,
      isTransferDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  }

  onMenuItemClick = (operation) => {
    switch(operation) {
      case 'Delete':
        this.toggleDeleteDialog();
        break;
      case 'Transfer':
        this.toggleTransferDialog();
        break;
      default:
        break;
    }
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
  }

  transferGroup = (receiver) => {
    this.props.transferGroup(this.props.item.id, receiver);
  }

  render() {
    const { isOpIconShown, isDeleteDialogOpen, isTransferDialogOpen } = this.state;
    const { item } = this.props;

    let groupName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', groupName);

    const libUrl = item.parent_group_id == 0 ?
      `${siteRoot}sys/groups/${item.id}/libraries/` :
      `${siteRoot}sysadmin/#address-book/groups/${item.id}/`;

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><a href={libUrl}>{item.name}</a></td>
          <td>
            {item.owner == 'system admin' ?
              '--' :
              <a href={`${siteRoot}useradmin/info/${encodeURIComponent(item.owner)}/`}>{item.owner_name}</a>
            }
          </td>
          <td>
            <span title={moment(item.created_at).format('llll')}>{moment(item.created_at).fromNow()}</span>
          </td>
          <td>
            {(isOpIconShown && item.owner != 'system admin') &&
            <OpMenu
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
            }
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationConfirmationDialog 
            title={gettext('Delete Group')}
            message={deleteDialogMsg}
            executeOperation={this.deleteGroup}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteDialog}
          />
        }
        {isTransferDialogOpen &&
          <SysAdminTransferGroupDialog
            groupName={item.name}
            transferGroup={this.transferGroup}
            toggleDialog={this.toggleTransferDialog}
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
      isCreateGroupDialogOpen: false
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
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  transferGroup = (groupID, receiverEmail) => {
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
            <a className="btn btn-secondary operation-item" href={`${siteRoot}sys/groupadmin/export-excel/`}>{gettext('Export Excel')}</a>
          </Fragment>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Groups')}</h3>
            </div>
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
            createGroup={this.createGroup}
            toggleDialog={this.toggleCreateGroupDialog}
          />
        }
      </Fragment>
    );
  }
}

export default Groups;
