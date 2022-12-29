import React, { Component, Fragment } from 'react';
import { Link } from '@gatsbyjs/reach-router';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { siteRoot, gettext } from '../../../utils/constants';
import Loading from '../../../components/loading';
import EmptyTip from '../../../components/empty-tip';
import Paginator from '../../../components/paginator';
import OpMenu from '../../../components/dialog/op-menu';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import SysAdminTransferGroupDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-group-transfer-dialog';
import UserLink from '../user-link';

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
    const { loading, errorMsg, items, pageInfo, curPerPage } = this.props;
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
          {pageInfo &&
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
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

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Transfer':
        translateResult = gettext('Transfer');
        break;
    }

    return translateResult;
  }

  render() {
    const { item } = this.props;
    const { isOpIconShown, isDeleteDialogOpen, isTransferDialogOpen } = this.state;

    let groupName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', groupName);

    const groupUrl = item.parent_group_id == 0 ?
      `${siteRoot}sys/groups/${item.id}/libraries/` :
      `${siteRoot}sys/departments/${item.id}/`;

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><Link to={groupUrl}>{item.name}</Link></td>
          <td>
            {item.owner == 'system admin' ?
              '--' :
              <UserLink email={item.owner} name={item.owner_name} />
            }
          </td>
          <td>
            <span title={moment(item.created_at).format('llll')}>{moment(item.created_at).fromNow()}</span>
          </td>
          <td>
            {(isOpIconShown && item.owner != 'system admin') &&
            <OpMenu
              operations={['Delete', 'Transfer']}
              translateOperations={this.translateOperations}
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

export default Content;
