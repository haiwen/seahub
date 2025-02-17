import React, { Component, Fragment } from 'react';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
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
  };

  onMouseEnter = () => {
    this.setState({
      isOpIconShown: true
    });
  };

  onMouseLeave = () => {
    this.setState({
      isOpIconShown: false
    });
  };

  deleteItem = () => {
    // make the icon avoid being clicked repeatedly
    this.setState({
      isOpIconShown: false
    });
    const token = this.props.invitation.token;
    seafileAPI.deleteInvitation(token).then((res) => {
      this.props.deleteItem(token);
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      this.setState({
        isOpIconShown: true
      });
    });
  };

  revokeItem = () => {
    const token = this.props.invitation.token;
    this.props.deleteItem(token);
  };

  toggleRevokeDialog = () => {
    this.setState({
      isRevokeDialogOpen: !this.state.isRevokeDialogOpen
    });
  };

  render() {
    const { isOpIconShown, isRevokeDialogOpen } = this.state;

    const item = this.props.invitation;

    return (
      <Fragment>
        {this.props.isDesktop ?
          <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter} tabIndex="0">
            <td>{item.accepter}</td>
            <td>{dayjs(item.invite_time).format('YYYY-MM-DD')}</td>
            <td>{dayjs(item.expire_time).format('YYYY-MM-DD')}</td>
            <td>{item.accept_time && <i className="sf2-icon-tick invite-accept-icon"></i>}</td>
            <td>
              {isOpIconShown && (
                item.accept_time ?
                  <i
                    role="button"
                    className="action-icon sf3-font sf3-font-cancel-invitation"
                    title={gettext('Revoke Access')}
                    aria-label={gettext('Revoke Access')}
                    onClick={this.toggleRevokeDialog}
                  >
                  </i> :
                  <i
                    role="button"
                    className="action-icon sf2-icon-x3"
                    title={gettext('Delete')}
                    aria-label={gettext('Delete')}
                    onClick={this.deleteItem}
                  >
                  </i>
              )}
            </td>
          </tr>
          :
          <tr>
            <td>
              {item.accepter}<br />
              <span className="item-meta-info">{dayjs(item.invite_time).format('YYYY-MM-DD')}<span className="small">({gettext('Invite Time')})</span></span>
              <span className="item-meta-info">{dayjs(item.expire_time).format('YYYY-MM-DD')}<span className="small">({gettext('Expiration')})</span></span>
              <span className="item-meta-info">{item.accept_time && gettext('Accepted')}</span>
            </td>
            <td>
              <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
                <DropdownToggle
                  tag="i"
                  className="sf-dropdown-toggle sf3-font sf3-font-more-vertical ml-0"
                  title={gettext('More operations')}
                  aria-label={gettext('More operations')}
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
        }
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
  isDesktop: PropTypes.bool.isRequired,
  deleteItem: PropTypes.func.isRequired
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
        <EmptyTip
          title={gettext('No guest invitations')}
          text={gettext('You have not invited any guests yet. A guest can access shared libraries through the web interface allowing more efficient ways to collaborate than through links. You can invite a guest by clicking the "Invite Guest" item in the dropdown menu.')}
        />
      );
    }

    const isDesktop = Utils.isDesktop();
    return (
      <table className={`table-hover${isDesktop ? '' : ' table-thead-hidden'}`}>
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
                deleteItem={this.props.deleteItem}
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
  };

  deleteItem = (token) => {
    this.setState({
      invitationsList: this.state.invitationsList.filter(item => item.token != token)
    });
  };

  toggleInvitePeopleDialog = () => {
    this.setState({
      isInvitePeopleDialogOpen: !this.state.isInvitePeopleDialogOpen
    });
  };

  render() {
    return (
      <Fragment>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <div className="d-flex">
                <h3 className="sf-heading">{gettext('Invite Guest')}</h3>
                <SingleDropdownToolbar
                  withPlusIcon={true}
                  opList={[{ 'text': gettext('Invite Guest'), 'onClick': this.toggleInvitePeopleDialog }]}
                />
              </div>
            </div>
            <div className="cur-view-content">
              <Content
                data={this.state}
                deleteItem={this.deleteItem}
              />
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

Content.propTypes = {
  data: PropTypes.object.isRequired,
};

export default InvitationsView;
