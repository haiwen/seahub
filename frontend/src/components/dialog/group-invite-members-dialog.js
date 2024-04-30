import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody } from 'reactstrap';
import copy from 'copy-to-clipboard';
import toaster from '../toast';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';

import '../../css/group-invite-members-dialog.css';

const propTypes = {
  groupID: PropTypes.string.isRequired,
  toggleGroupInviteDialog: PropTypes.func.isRequired,
};

class GroupInviteMembersDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      inviteList: [],
    };
  }

  componentDidMount() {
    this.listInviteLinks();
  }

  listInviteLinks = () => {
    seafileAPI.getGroupInviteLinks(this.props.groupID).then((res) => {
      this.setState({ inviteList: res.data.group_invite_link_list });
    }).catch(error => {
      this.onError(error);
    });
  };

  addInviteLink = () => {
    seafileAPI.addGroupInviteLinks(this.props.groupID).then(() => {
      this.listInviteLinks();
    }).catch(error => {
      this.onError(error);
    });
  };

  deleteLink = (token) => {
    seafileAPI.deleteGroupInviteLinks(this.props.groupID, token).then(() => {
      this.listInviteLinks();
    }).catch(error => {
      this.onError(error);
    });
  };

  onError = (error) => {
    let errMsg = Utils.getErrorMsg(error, true);
    if (!error.response || error.response.status !== 403) {
      toaster.danger(errMsg);
    }
  };

  copyLink = () => {
    const inviteLinkItem = this.state.inviteList[0];
    copy(inviteLinkItem.link);
    const message = gettext('Invitation link has been copied to clipboard');
    toaster.success((message), {
      duration: 2
    });
  };

  toggle = () => {
    this.props.toggleGroupInviteDialog();
  };

  render() {
    const { inviteList } = this.state;
    const link = inviteList[0];
    return (
      <Modal isOpen={true} toggle={this.toggle} className="group-invite-members">
        <ModalHeader toggle={this.toggle}>{gettext('Invite members')}</ModalHeader>
        <ModalBody>
          {link ?
            <>
              <div>
                <strong>{gettext('Group invitation link')}</strong>
              </div>
              <div className="invite-link-item">
                <div className="form-item text-truncate">{link.link}</div>
                <div className="invite-link-copy">
                  <Button color="primary" onClick={this.copyLink} className="invite-link-copy-btn text-truncate">{gettext('Copy')}</Button>
                </div>
                <Button color="secondary" onClick={this.deleteLink.bind(this, link.token)} className="delete-link-btn ml-2">
                  <i className="sf2-icon-delete"></i>
                </Button>
              </div>
            </>
            :
            <>
              <div className="no-link-tip mb-4">
                {gettext('No group invitation link yet. Group invitation link let registered users to join the group by clicking a link.')}
              </div>
              <Button color="primary" onClick={this.addInviteLink} className="my-4">{gettext('Generate')}</Button>
            </>
          }
        </ModalBody>
      </Modal>
    );
  }
}

GroupInviteMembersDialog.propTypes = propTypes;

export default GroupInviteMembersDialog;
