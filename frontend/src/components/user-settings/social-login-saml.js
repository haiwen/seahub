import React from 'react';
import { Modal, ModalBody, ModalFooter, Button } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const {
  csrfToken,
  isOrgContext,
  orgID,
  samlConnected,
  enableMultiADFS,
  orgSamlConnected,
  socialNextPage,
  forceUserSSOLogin,
} = window.app.pageOptions;

class SocialLoginSAML extends React.Component {

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
    let connectUrl = (enableMultiADFS && isOrgContext) ? `${siteRoot}org/custom/${orgID}/saml2/connect/?next=${encodeURIComponent(socialNextPage)}` : `${siteRoot}saml2/connect/?next=${encodeURIComponent(socialNextPage)}`;
    let disconnectUrl = (orgSamlConnected && isOrgContext) ? `${siteRoot}org/custom/${orgID}/saml2/disconnect/?next=${encodeURIComponent(socialNextPage)}` : `${siteRoot}saml2/disconnect/?next=${encodeURIComponent(socialNextPage)}`;

    return (
      <React.Fragment>
        <div className="setting-item" id="social-auth">
          <h3 className="setting-item-heading">{gettext('Single Sign On (SSO)')}</h3>
          <p className="mb-2">{'SAML'}</p>
          {(samlConnected || (orgSamlConnected && isOrgContext)) ?
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

export default SocialLoginSAML;
