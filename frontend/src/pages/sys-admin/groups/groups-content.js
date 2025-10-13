import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Utils } from '../../../utils/utils';
import { siteRoot, gettext, isPro } from '../../../utils/constants';
import Loading from '../../../components/loading';
import EmptyTip from '../../../components/empty-tip';
import Paginator from '../../../components/paginator';
import OpMenu from '../../../components/dialog/op-menu';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import SysAdminTransferGroupDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-group-transfer-dialog';
import ChangeGroupDialog from '../../../components/dialog/change-group-dialog';
import UserLink from '../user-link';
import { formatWithTimezone } from '../../../utils/time';

dayjs.extend(relativeTime);

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
  };

  getPreviousPage = () => {
    this.props.getListByPage(this.props.pageInfo.current_page - 1);
  };

  getNextPage = () => {
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
        <EmptyTip text={gettext('No groups')}>
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
                  changeGroup2Department={this.props.changeGroup2Department}
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

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  getDeviceErrorsListByPage: PropTypes.func,
  resetPerPage: PropTypes.func,
  curPerPage: PropTypes.number,
  pageInfo: PropTypes.object,
  getListByPage: PropTypes.func.isRequired,
  deleteGroup: PropTypes.func.isRequired,
  transferGroup: PropTypes.func.isRequired,
  changeGroup2Department: PropTypes.func.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      highlight: false,
      isDeleteDialogOpen: false,
      isTransferDialogOpen: false,
      isChangeDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  };

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  };

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  };

  onMenuItemClick = (operation) => {
    switch (operation) {
      case 'Delete':
        this.toggleDeleteDialog();
        break;
      case 'Transfer':
        this.toggleTransferDialog();
        break;
      case 'Change':
        this.toggleChangeDialog();
        break;
      default:
        break;
    }
  };

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({ isDeleteDialogOpen: !this.state.isDeleteDialogOpen });
  };

  toggleTransferDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({ isTransferDialogOpen: !this.state.isTransferDialogOpen });
  };

  toggleChangeDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({ isChangeDialogOpen: !this.state.isChangeDialogOpen });
  };
  deleteGroup = () => {
    this.props.deleteGroup(this.props.item.id);
  };

  transferGroup = (receiver) => {
    this.props.transferGroup(this.props.item.id, receiver);
  };

  changeGroup = () => {
    this.props.changeGroup2Department(this.props.item.id);
  };

  translateOperations = (item) => {
    let translateResult = '';
    switch (item) {
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Transfer':
        translateResult = gettext('Transfer');
        break;
      case 'Change':
        translateResult = gettext('Change to department');
        break;
    }

    return translateResult;
  };

  render() {
    const { item } = this.props;
    const { isOpIconShown, isDeleteDialogOpen, isTransferDialogOpen, isChangeDialogOpen } = this.state;

    let groupName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', groupName);

    const groupUrl = `${siteRoot}sys/groups/${item.id}/libraries/`;

    let operations = [];
    if (isPro) {
      operations = ['Delete', 'Transfer', 'Change'];
    } else {
      operations = ['Delete', 'Transfer'];
    }

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
            <span title={formatWithTimezone(item.created_at)}>{dayjs(item.created_at).fromNow()}</span>
          </td>
          <td>
            {(isOpIconShown && item.owner != 'system admin') &&
            <OpMenu
              operations={operations}
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
        {isChangeDialogOpen &&
          <ChangeGroupDialog
            groupName={item.name}
            changeGroup2Department={this.changeGroup}
            toggleDialog={this.toggleChangeDialog}
          />
        }
      </Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  deleteGroup: PropTypes.func.isRequired,
  transferGroup: PropTypes.func.isRequired,
};

export default Content;
