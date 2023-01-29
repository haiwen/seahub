import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import OpMenu from '../../../components/dialog/op-menu';
import MainPanelTopbar from '../main-panel-topbar';
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
    this.props.getItemsByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getItemsByPage(this.props.currentPage + 1);
  }

  render() {
    const { loading, errorMsg, items, pageInfo, curPerPage, hasNextPage, currentPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No invitations')}</h2>
        </EmptyTip>
      );

      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="20%">{gettext('Inviter')}</th>
                <th width="20%">{gettext('Accepter')}</th>
                <th width="9%">{gettext('Type')}</th>
                <th width="14%">{gettext('Invited at')}</th>
                <th width="14%">{gettext('Accepted at')}</th>
                <th width="18%">{gettext('Expired at')}</th>
                <th width="5%"></th>
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
                  deleteItem={this.props.deleteItem}
                />);
              })}
            </tbody>
          </table>
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            curPerPage={curPerPage}
            resetPerPage={this.props.resetPerPage}
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
      highlight: false
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

  deleteItem = () => {
    this.props.deleteItem(this.props.item);
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch (item) {
      case 'Delete':
        translateResult = gettext('Delete');
        break;
    }
    return translateResult;
  }

  onMenuItemClick = (operation) => {
    switch(operation) {
      case 'Delete':
        this.deleteItem();
        break;
      default:
        break;
    }
  }

  getInviteTypeText = () => {
    let translateResult = '';
    switch (this.props.item.invite_type) {
      case 'Guest':
        translateResult = gettext('Guest');
        break;
    }
    return translateResult;
  }

  render() {
    const { item } = this.props;
    const {
      isOpIconShown
    } = this.state;

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td>
            <UserLink email={item.inviter_email} name={item.inviter_name} />
          </td>
          <td>
            {item.accept_time ?
              <UserLink email={item.accepter_email} name={item.accepter_name} /> :
              item.accepter_email
            }
          </td>
          <td>{this.getInviteTypeText()}</td>
          <td>
            <span title={moment(item.invite_time).format('llll')}>{moment(item.invite_time).fromNow()}</span>
          </td>
          <td>
            {item.accept_time ?
              <span title={moment(item.accept_time).format('llll')}>{moment(item.accept_time).fromNow()}</span> :
              '--'
            }
          </td>
          <td>
            {item.is_expired ?
              <span className="text-red">{moment(item.expire_time).format('YYYY-MM-DD HH:mm')}</span> :
              moment(item.expire_time).format('YYYY-MM-DD HH:mm')
            }
          </td>
          <td>
            {isOpIconShown &&
            <OpMenu
              operations={['Delete']}
              translateOperations={this.translateOperations}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
            }
          </td>
        </tr>
      </Fragment>
    );
  }
}


class Invitations extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      totalItemCount: 0,
      hasNextPage: false,
      currentPage: 1,
      perPage: 25
    };
  }

  componentDidMount () {
    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getItemsByPage(this.state.currentPage);
    });
  }

  getItemsByPage = (page) => {
    let { perPage } = this.state;
    seafileAPI.sysAdminListInvitations(page, perPage).then(res => {
      this.setState({
        loading: false,
        items: res.data.invitation_list,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.total_count),
        currentPage: page
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteItem = (targetItem) => {
    const token = targetItem.token;
    seafileAPI.sysAdminDeleteInvitation(token).then(res => {
      let items = this.state.items.filter(item => {
        return item.token != token;
      });
      this.setState({items: items});
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteItemInBatch = () => {
    seafileAPI.sysAdminDeleteExpiredInvitations().then(res => {
      const prevItems = this.state.items;
      const items = this.state.items.filter(item => !item.is_expired || item.accept_time);
      if (items.length < prevItems.length) {
        this.setState({
          items: items
        });
        toaster.success(gettext('Operation succeeded.'));
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getItemsByPage(1);
    });
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.deleteItemInBatch}>{gettext('Delete Expired Invitations')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Invitations')}</h3>
            </div>
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
                currentPage={this.state.currentPage}
                hasNextPage={this.state.hasNextPage}
                curPerPage={this.state.perPage}
                resetPerPage={this.resetPerPage}
                getItemsByPage={this.getItemsByPage}
                deleteItem={this.deleteItem}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Invitations;
