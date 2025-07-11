import React from 'react';
import { gettext, siteRoot } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import ConfirmDisconnectWeixin from '../dialog/confirm-disconnect-weixin';

const {
  csrfToken,
  langCode,
  socialConnectedWeixin,
  socialNextPage
} = window.app.pageOptions;

class SocialLoginWeixin extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isConfirmDialogOpen: false
    };
  }

  confirmDisconnect = () => {
    this.setState({
      isConfirmDialogOpen: true
    });
  };

  toggleDialog = () => {
    this.setState({
      isConfirmDialogOpen: !this.state.isConfirmDialogOpen
    });
  };

  render() {
    return (
      <React.Fragment>
        <div className="setting-item" id="social-auth">
          <h3 className="setting-item-heading">{gettext('Single Sign On (SSO)')}</h3>
          <p className="mb-2">{langCode == 'zh-cn' ? '微信' : 'Weixin'}</p>
          {socialConnectedWeixin ?
            <button className="btn btn-outline-primary" onClick={this.confirmDisconnect}>{gettext('Disconnect')}</button> :
            <a href={`${siteRoot}weixin/oauth-connect/?next=${encodeURIComponent(socialNextPage)}`} className="btn btn-outline-primary">{gettext('Connect')}</a>
          }
        </div>
        {this.state.isConfirmDialogOpen && (
          <ModalPortal>
            <ConfirmDisconnectWeixin
              formActionURL={`${siteRoot}weixin/oauth-disconnect/?next=${encodeURIComponent(socialNextPage)}`}
              csrfToken={csrfToken}
              toggle={this.toggleDialog}
            />
          </ModalPortal>
        )}
      </React.Fragment>
    );
  }
}

export default SocialLoginWeixin;
