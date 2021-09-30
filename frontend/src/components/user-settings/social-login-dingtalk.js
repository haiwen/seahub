import React from 'react';
import { gettext, siteRoot } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import ConfirmDisconnectDingtalk from '../dialog/confirm-disconnect-dingtalk';

const {
  csrfToken,
  langCode,
  socialConnectedDingtalk,
  socialNextPage
} = window.app.pageOptions;

class SocialLoginDintalk extends React.Component {

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
  }

  toggleDialog = () => {
    this.setState({
      isConfirmDialogOpen: !this.state.isConfirmDialogOpen
    });
  }

  render() {
    return (
      <React.Fragment>
        <div className="setting-item" id="social-auth">
          <h3 className="setting-item-heading">{gettext('Social Login')}</h3>
          <p className="mb-2">{langCode == 'zh-cn' ? '钉钉': 'Dingtalk'}</p>
          {socialConnectedDingtalk ?
            <button className="btn btn-outline-primary" onClick={this.confirmDisconnect}>{gettext('Disconnect')}</button> :
            <a href={`${siteRoot}dingtalk/connect/?next=${encodeURIComponent(socialNextPage)}`} className="btn btn-outline-primary">{gettext('Connect')}</a>
          }
        </div>
        {this.state.isConfirmDialogOpen && (
          <ModalPortal>
            <ConfirmDisconnectDingtalk
              formActionURL={`${siteRoot}dingtalk/disconnect/?next=${encodeURIComponent(socialNextPage)}`}
              csrfToken={csrfToken}
              toggle={this.toggleDialog}
            />
          </ModalPortal>
        )}
      </React.Fragment>
    );
  }
}

export default SocialLoginDintalk;
