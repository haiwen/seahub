import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../utils/constants';
import toaster from '../toast';
import copy from '../copy-to-clipboard';

const propTypes = {
  toggle: PropTypes.func.isRequired,
  invitationLink: PropTypes.string.isRequired
};

class OrgAdminInviteUserViaWeiXinDialog extends React.Component {

  constructor(props) {
    super(props);
  }

  copyLink = () => {
    copy(this.props.invitationLink);
    this.props.toggle();
    const message = gettext('Internal link has been copied to clipboard');
    toaster.success(message), {
      duration: 2
    };
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.props.toggle}>{'通过微信邀请用户'}</ModalHeader>
        <ModalBody>
          <p>{'请将邀请链接发送给其他人，这样他们就可以通过扫描链接里的二维码来加入组织。'}</p>
          <p>{this.props.invitationLink}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.copyLink}>{gettext('Copy')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

OrgAdminInviteUserViaWeiXinDialog.propTypes = propTypes;

export default OrgAdminInviteUserViaWeiXinDialog;
