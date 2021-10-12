import React, { Component, Fragment } from 'react';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import InvitationsToolbar from '../../components/toolbar/invitations-toolbar';
import InvitePeopleDialog from '../../components/dialog/invite-people-dialog';
import InvitationRevokeDialog from '../../components/dialog/invitation-revoke-dialog';
import Loading from '../../components/loading';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';

import '../../css/invitations.css';

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      isOpMenuOpen: false, // for mobile
      isRevokeDialogOpen: false
    };
  }

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  }

  onMouseEnter = () => {
    this.setState({
      isOpIconShown: true
    });
  }

  onMouseLeave = () => {
    this.setState({
      isOpIconShown: false
    });
  }

  deleteItem = (e) => {
    e.preventDefault();
    // make the icon avoid being clicked repeatedly
    this.setState({
      isOpIconShown: false
    });
    const token = this.props.invitation.token;
    seafileAPI.deleteInvitation(token).then((res) => {
      this.setState({deleted: true});
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      this.setState({
        isOpIconShown: true
      });
    });
  }

  revokeItem = () => {
    this.setState({deleted: true});
  }

  toggleRevokeDialog = (e) => {
    e.preventDefault();
    this.setState({
      isRevokeDialogOpen: !this.state.isRevokeDialogOpen
    });
  }

  render() {
    const { isOpIconShown, deleted, isRevokeDialogOpen } = this.state;

    if (deleted) {
      return null;
    }

    const item = this.props.invitation;

    const desktopItem = (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter} tabIndex="0">
        <td>{item.accepter}</td>
        <td>{moment(item.invite_time).format('YYYY-MM-DD')}</td>
        <td>{moment(item.expire_time).format('YYYY-MM-DD')}</td>
        <td>{item.accept_time && <i className="sf2-icon-tick invite-accept-icon"></i>}</td>
        <td>
          {isOpIconShown && (
            item.accept_time ?
              <a href="#"
                role="button"
                className="action-icon sf3-font sf3-font-cancel-invitation"
                title={gettext('Revoke Access')}
                aria-label={gettext('Revoke Access')}
                onClick={this.toggleRevokeDialog}>
              </a> :
              <a href="#"
                role="button"
                className="action-icon sf2-icon-x3"
                title={gettext('Delete')}
                aria-label={gettext('Delete')}
                onClick={this.deleteItem}>
              </a>
          )}
        </td>
      </tr>
    );

    const mobileItem = (
      <tr>
        <td>
          {item.accepter}<br />
          <span className="item-meta-info">{moment(item.invite_time).format('YYYY-MM-DD')}<span className="small">({gettext('Invite Time')})</span></span>
          <span className="item-meta-info">{moment(item.expire_time).format('YYYY-MM-DD')}<span className="small">({gettext('Expiration')})</span></span>
          <span className="item-meta-info">{item.accept_time && gettext('Accepted')}</span>
        </td>
        <td>
          <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
            <DropdownToggle
              tag="i"
              className="sf-dropdown-toggle fa fa-ellipsis-v ml-0"
              title={gettext('More Operations')}
              data-toggle="dropdown"
              aria-expanded={this.state.isOpMenuOpen}
            />
            <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
              <div className="mobile-operation-menu-bg-layer"></div>
              <div className="mobile-operation-menu">
                {item.accept_time ?
                  <DropdownItem className="mobile-menu-item" onClick={this.toggleRevokeDialog}>{gettext('Revoke Access')}</DropdownItem> :
                  <DropdownItem className="mobile-menu-item" onClick={this.deleteItem}>{gettext('Delete')}</DropdownItem>
                }
              </div>
            </div>
          </Dropdown>
        </td>
      </tr>
    );

    return (
      <Fragment>
        {this.props.isDesktop ? desktopItem : mobileItem}
        {isRevokeDialogOpen &&
        <InvitationRevokeDialog
          accepter={item.accepter}
          token={item.token}
          revokeInvitation={this.revokeItem}
          toggleDialog={this.toggleRevokeDialog}
        />
        }
      </Fragment>
    );
  }
}

const ItemPropTypes = {
  invitation: PropTypes.object.isRequired,
};

Item.propTypes = ItemPropTypes;

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const {
      loading, errorMsg, invitationsList
    } = this.props.data;

    if (loading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error text-center mt-2">{errorMsg}</p>;
    }

    if (!invitationsList.length) {
      return (
        <EmptyTip>
          <h2>{gettext('No guest invitations')}</h2>
          <p>{gettext('You have not invited any guests yet. A guest can access shared libraries through the web interface allowing more efficient ways to collaborate than through links. You can invite a guest by clicking the "Invite Guest" button in the menu bar.')}</p>
        </EmptyTip>
      );
    }

    const isDesktop = Utils.isDesktop();
    return (
      <table className={`table-hover${isDesktop ? '': ' table-thead-hidden'}`}>
        <thead>
          {isDesktop ?
            <tr>
              <th width="25%">{gettext('Email')}</th>
              <th width="20%">{gettext('Invite Time')}</th>
              <th width="20%">{gettext('Expiration')}</th>
              <th width="18%">{gettext('Accepted')}</th>
              <th width="7%"></th>
            </tr>
            :
            <tr>
              <th width="92%"></th>
              <th width="8%"></th>
            </tr>
          }
        </thead>
        <tbody>
          {invitationsList.map((invitation, index) => {
            return (
              <Item
                key={index}
                isDesktop={isDesktop}
                invitation={invitation}
              />
            );
          })}
        </tbody>
      </table>
    );
  }
}

class InvitationsView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      invitationsList: [],
      isInvitePeopleDialogOpen: false
    };
  }

  componentDidMount() {
    seafileAPI.listInvitations().then((res) => {
      this.setState({
        invitationsList: res.data,
        loading: false
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  onInvitePeople = (invitationsArray) => {
    invitationsArray.push.apply(invitationsArray, this.state.invitationsList);
    this.setState({
      invitationsList: invitationsArray,
    });
  }

  toggleInvitePeopleDialog = () => {
    this.setState({
      isInvitePeopleDialogOpen: !this.state.isInvitePeopleDialogOpen
    });
  }

  render() {
    return (
      <Fragment>
        <InvitationsToolbar
          onShowSidePanel={this.props.onShowSidePanel}
          onSearchedClick={this.props.onSearchedClick}
          toggleInvitePeopleDialog={this.toggleInvitePeopleDialog}
        />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Invite Guest')}</h3>
            </div>
            <div className="cur-view-content">
              <Content data={this.state} />
            </div>
          </div>
        </div>
        {this.state.isInvitePeopleDialogOpen &&
        <InvitePeopleDialog
          onInvitePeople={this.onInvitePeople}
          toggleDialog={this.toggleInvitePeopleDialog}
        />
        }
      </Fragment>
    );
  }
}

const InvitationsViewPropTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

InvitationsView.propTypes = InvitationsViewPropTypes;

export default InvitationsView;
