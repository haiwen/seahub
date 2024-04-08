import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { gettext, contactEmail } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  toggleDialog: PropTypes.func.isRequired,
};

class ResetEncryptedRepoPasswordDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      errMessage: '',
      showLoading: true,
      showSuccess: false,
      showError: false,
    };
  }

  componentDidMount() {
    seafileAPI.resetAndSendEncryptedRepoPassword(this.props.repoID).then((res) => {
      this.setState({showLoading: false});
      this.setState({showSuccess: true});
    }).catch((error) => {
      if (error.response) {
        this.setState({
          errMessage: error.response.data.error_msg
        });
        this.setState({showLoading: false});
        this.setState({showError: true});
      }
    });
  }

  render() {

    let user_email = '<strong>' + contactEmail + '</strong>';
    let message = gettext('New password has been sent to your email {mail}. Please check your mailbox. If you don’t receive the password, please check if your email address is properly configured.').replace('{mail}', user_email);

    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <ModalHeader toggle={this.props.toggleDialog}>
          {gettext('Reset library password')}
        </ModalHeader>
        <ModalBody>
          {this.state.showLoading && (
            <span>{gettext('Sending new password...')}</span>
          )}
          {this.state.showSuccess && (
            <div dangerouslySetInnerHTML={{__html:message}} />
          )}
          {this.state.showError && (
            <span className="err-message">{this.state.errMessage}</span>
          )}
        </ModalBody>
      </Modal>
    );
  }
}

ResetEncryptedRepoPasswordDialog.propTypes = propTypes;

export default ResetEncryptedRepoPasswordDialog;
