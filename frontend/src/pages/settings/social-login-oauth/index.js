import React from 'react';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import ModalPortal from '@/components/modal-portal';
import SeahubModalHeader from '@/components/seahub-modal-header';
import { gettext, siteRoot } from '@/utils/constants';

const {
  csrfToken,
  oauthConnected,
  socialNextPage,
  forceUserSSOLogin,
} = window.app.pageOptions;

class SocialLoginOAuth extends React.Component {

  constructor(props) {
    super(props);
    this.form = React.createRef();
    this.state = {
      isConfirmDialogOpen: false
    };
  }

  confirmDisconnect = () => {
    this.setState({
      isConfirmDialogOpen: true
    });
  };

  disconnect = () => {
    this.form.current.submit();
  };

  toggleDialog = () => {
    this.setState({
      isConfirmDialogOpen: !this.state.isConfirmDialogOpen
    });
  };

  render() {
    const connectUrl = `${siteRoot}oauth/connect/?next=${encodeURIComponent(socialNextPage)}`;
    const disconnectUrl = `${siteRoot}oauth/disconnect/?next=${encodeURIComponent(socialNextPage)}`;

    return (
      <React.Fragment>
        <div className="setting-item" id="social-auth">
          <h3 className="setting-item-heading">{gettext('Single Sign On (SSO)')}</h3>
          <p className="mb-2">{'OAuth'}</p>
          {oauthConnected ?
            <button className="btn btn-outline-primary" onClick={this.confirmDisconnect} disabled={forceUserSSOLogin}>{gettext('Disconnect')}</button> :
            <a href={connectUrl} className="btn btn-outline-primary">{gettext('Connect')}</a>
          }
        </div>
        {this.state.isConfirmDialogOpen && (
          <ModalPortal>
            <Modal centered={true} isOpen={true} toggle={this.toggleDialog}>
              <SeahubModalHeader toggle={this.toggleDialog}>{gettext('Disconnect')}</SeahubModalHeader>
              <ModalBody>
                <p>{gettext('Are you sure you want to disconnect?')}</p>
                <form ref={this.form} className="d-none" method="post" action={disconnectUrl}>
                  <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />
                </form>
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" onClick={this.toggleDialog}>{gettext('Cancel')}</Button>
                <Button color="primary" onClick={this.disconnect}>{gettext('Disconnect')}</Button>
              </ModalFooter>
            </Modal>
          </ModalPortal>
        )}
      </React.Fragment>
    );
  }
}

export default SocialLoginOAuth;
