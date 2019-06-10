import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {gettext, siteRoot} from '../../utils/constants';
import InvitationsToolbar from '../../components/toolbar/invitations-toolbar';
import InvitePeopleDialog from '../../components/dialog/invite-people-dialog';
import {seafileAPI} from '../../utils/seafile-api';
import {Table} from 'reactstrap';
import Loading from '../../components/loading';
import moment from 'moment';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';

import '../../css/invitations.css';

class InvitationsListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
    };
  }

  onMouseEnter = (event) => {
    event.preventDefault();
    this.setState({
      isOperationShow: true,
    });
  }

  onMouseOver = () => {
    this.setState({
      isOperationShow: true,
    });
  }

  onMouseLeave = () => {
    this.setState({
      isOperationShow: false,
    });
  }

  render() {
    const invitationItem = this.props.invitation;
    const acceptIcon = <i className="sf2-icon-tick invite-accept-icon"></i>;
    const deleteOperation = <i className="action-icon sf2-icon-x3"
      title={gettext('Delete')}
      style={!this.state.isOperationShow ? {opacity: 0} : {}}
      onClick={this.props.onItemDelete.bind(this, invitationItem.token, this.props.index)}></i>;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
        <td>{invitationItem.accepter}</td>
        <td>{moment(invitationItem.invite_time).format('YYYY-MM-DD')}</td>
        <td>{moment(invitationItem.expire_time).format('YYYY-MM-DD')}</td>
        <td>{invitationItem.accept_time && acceptIcon}</td>
        <td>{!invitationItem.accept_time && deleteOperation}</td>
      </tr>
    );
  }
}

const InvitationsListItemPropTypes = {
  invitation: PropTypes.object.isRequired,
  onItemDelete: PropTypes.func.isRequired,
};

InvitationsListItem.propTypes = InvitationsListItemPropTypes;

class InvitationsListView extends React.Component {

  constructor(props) {
    super(props);
  }

  onItemDelete = (token, index) => {
    seafileAPI.deleteInvitation(token).then((res) => {
      this.props.onDeleteInvitation(index);
      toaster.success(gettext('Successfully deleted 1 item.'), {duration: 1});
    }).catch((error) => {
      if (error.response){
        toaster.danger(error.response.data.detail || gettext('Error'), {duration: 3});
      } else {
        toaster.danger(gettext('Please check the network.'), {duration: 3});
      }
    });
  }

  render() {
    const invitationsListItems = this.props.invitationsList.map((invitation, index) => {
      return (
        <InvitationsListItem
          key={index}
          onItemDelete={this.onItemDelete}
          invitation={invitation}
          index={index}
        />);
    });

    return (
      <Table hover>
        <thead>
          <tr>
            <th width="25%">{gettext('Email')}</th>
            <th width="20%">{gettext('Invite Time')}</th>
            <th width="20%">{gettext('Expiration')}</th>
            <th width="18%">{gettext('Accepted')}</th>
            <th width="7%"></th>
          </tr>
        </thead>
        <tbody>
          {invitationsListItems}
        </tbody>
      </Table>
    );
  }
}

const InvitationsListViewPropTypes = {
  invitationsList: PropTypes.array.isRequired,
  onDeleteInvitation: PropTypes.func.isRequired,
};

InvitationsListView.propTypes = InvitationsListViewPropTypes;

class InvitationsView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isInvitePeopleDialogOpen: false,
      invitationsList: [],
      isLoading: true,
      permissionDeniedMsg: '',
      showEmptyTip: false,
    };
  }

  listInvitations = () => {
    seafileAPI.listInvitations().then((res) => {
      this.setState({
        invitationsList: res.data,
        showEmptyTip: true,
        isLoading: false,
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
      });
      if (error.response){
        if (error.response.status === 403){
          let permissionDeniedMsg = gettext('Permission error');
          this.setState({
            permissionDeniedMsg: permissionDeniedMsg,
          });
        } else{
          toaster.danger(error.response.data.detail || gettext('Error'), {duration: 3});
        }
      } else {
        toaster.danger(gettext('Please check the network.'), {duration: 3});
      }
    });
  }

  onInvitePeople = (invitationsArray) => {
    invitationsArray.push.apply(invitationsArray,this.state.invitationsList);
    this.setState({
      invitationsList: invitationsArray,
    });
  }

  onDeleteInvitation = (index) => {
    this.state.invitationsList.splice(index, 1);
    this.setState({
      invitationsList: this.state.invitationsList,
    });
  }

  componentDidMount() {
    this.listInvitations();
  }

  toggleInvitePeopleDialog = () => {
    this.setState({
      isInvitePeopleDialogOpen: !this.state.isInvitePeopleDialogOpen
    });
  }

  emptyTip = () => {
    return (
      <EmptyTip>
        <h2>{gettext('You have not invited any people.')}</h2>
      </EmptyTip>
    );
  }

  handlePermissionDenied = () => {
    window.location = siteRoot;
    return(
      <div className="error mt-6 text-center">
        <span>{this.state.permissionDeniedMsg}</span>
      </div>
    );
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
              <h3 className="sf-heading">{gettext('Invite People')}</h3>
            </div>
            <div className="cur-view-content">
              {this.state.isLoading && <Loading/>}
              {(!this.state.isLoading && this.state.permissionDeniedMsg !== '') && this.handlePermissionDenied() }
              {(!this.state.isLoading && this.state.showEmptyTip && this.state.invitationsList.length === 0) && this.emptyTip()}
              {(!this.state.isLoading && this.state.invitationsList.length !== 0) &&
              < InvitationsListView
                invitationsList={this.state.invitationsList}
                onDeleteInvitation={this.onDeleteInvitation}
              />}
            </div>
          </div>
        </div>
        {this.state.isInvitePeopleDialogOpen &&
        <InvitePeopleDialog
          toggleInvitePeopleDialog={this.toggleInvitePeopleDialog}
          isInvitePeopleDialogOpen={this.state.isInvitePeopleDialogOpen}
          onInvitePeople={this.onInvitePeople}
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
