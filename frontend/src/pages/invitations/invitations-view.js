import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {gettext} from '../../utils/constants';
import InvitationsToolbar from '../../components/toolbar/invitations-toolbar';
import InvitePeopleDialog from "../../components/dialog/invite-people-dialog";
import {seafileAPI} from "../../utils/seafile-api";
import {Table} from 'reactstrap';
import Loading from "../../components/loading";
import moment from 'moment';
import "../../css/invitations.css";

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
                               onClick={this.props.onItemDelete.bind(this, invitationItem.token)}></i>;
    return (
      <tr onMouseEnter={this.onMouseEnter}
          onMouseOver={this.onMouseOver}
          onMouseLeave={this.onMouseLeave}>
        <td>{invitationItem.accepter}</td>
        <td>{moment(invitationItem.invite_time).format("YYYY-MM-DD")}</td>
        <td>{moment(invitationItem.expire_time).format("YYYY-MM-DD")}</td>
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

  onItemDelete = (token) => {
    seafileAPI.deleteInvitation(token).then((res) => {
      this.props.listInvitations();
    }).catch((error) => {
    }); //todo
  }

  render() {
    const invitationsTables = this.props.invitationsList.map((invitation, index) => {
      return (
        <InvitationsListItem
          key={index}
          onItemDelete={this.onItemDelete}
          invitation={invitation}
        />)
    });

    return (
      <Table hover>
        <thead>
        <tr>
          <th width="40%">email</th>
          <th width="20%">invite time</th>
          <th width="20%">expire time</th>
          <th width="10%">accept</th>
          <th width="10%"></th>
        </tr>
        </thead>
        <tbody>
        {invitationsTables}
        </tbody>
      </Table>
    );
  }
}

const InvitationsListViewPropTypes = {
  invitationsList: PropTypes.array.isRequired,
};

InvitationsListView.propTypes = InvitationsListViewPropTypes;

class InvitationsView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showInvitationsModal: false,
      invitationsList: [],
      isLoading: true,
      errorMsg: '',
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
      let errorMsg = gettext(error.response.data.error_msg);
      this.setState({
        errorMsg: errorMsg,
        isLoading: false,
      });
    });
  }

  onInvitePeople = () => {
    this.setState({
      showInvitationsModal: false,
      invitationsList: [],
      isLoading: true,
    });
    this.listInvitations();
  }

  componentDidMount() {
    this.listInvitations();
  }

  toggleInvitationsModal = () => {
    this.setState({
      showInvitationsModal: !this.state.showInvitationsModal
    });
  }

  emptyTip = () => {
    return (
      <div className="message empty-tip">
        <h2>{gettext('You have not invited any people.')}</h2>
      </div>
    )
  }

  render() {
    return (
      <Fragment>
        <InvitationsToolbar
          onShowSidePanel={this.props.onShowSidePanel}
          onSearchedClick={this.props.onSearchedClick}
          toggleInvitationsModal={this.toggleInvitationsModal}
        />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Invite People')}</h3>
            </div>
            {this.state.isLoading && <Loading/>}
            {(!this.state.isLoading && this.state.errorMsg !== '') && this.state.errorMsg}
            {(!this.state.isLoading && this.state.invitationsList.length !== 0) &&
            < InvitationsListView
              invitationsList={this.state.invitationsList}
              listInvitations={this.listInvitations}
            />
            }
            {(!this.state.isLoading && this.state.showEmptyTip && this.state.invitationsList.length === 0) && this.emptyTip()}
          </div>
        </div>
        {this.state.showInvitationsModal &&
        <InvitePeopleDialog
          toggleInvitationsModal={this.toggleInvitationsModal}
          showInvitationsModal={this.state.showInvitationsModal}
          onInvitePeople={this.onInvitePeople}
          listInvitations={this.listInvitations}
        />
        }
      </Fragment>
    );
  }
}

export default InvitationsView;
