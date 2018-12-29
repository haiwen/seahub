import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Utils } from '../../utils/utils';
import editorUtilities from '../../utils/editor-utilties';
import { siteRoot, gettext } from '../../utils/constants';

class Account extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showInfo: false,
      userName: '',
      contactEmail: '',
      quotaUsage: '',
      quotaTotal: '',
      isStaff: false,
      isOrgStaff: false,
      usageRate: '',
      avatarURL: '',
    };
  }

  componentDidMount(){
    this.getAccountInfo();
  }

  componentDidUpdate(prevProps) {
    this.handleProps();
  }

  getContainer = () => {
    return ReactDOM.findDOMNode(this);
  }

  handleProps = () => {
    if (this.state.showInfo) {
      this.addEvents();
    } else {
      this.removeEvents();
    }
  }

  addEvents = () => {
    ['click', 'touchstart', 'keyup'].forEach(event =>
      document.addEventListener(event, this.handleDocumentClick, true)
    );
  }

  removeEvents = () => {
    ['click', 'touchstart', 'keyup'].forEach(event =>
      document.removeEventListener(event, this.handleDocumentClick, true)
    );
  }

  handleDocumentClick = (e) => {
    if (e && (e.which === 3 || (e.type === 'keyup' && e.which !== Utils.keyCodes.tab))) return;
    const container = this.getContainer();

    if (container.contains(e.target) && container !== e.target && (e.type !== 'keyup' || e.which === Utils.keyCodes.tab)) {
      return;
    }

    this.setState({
      showInfo: !this.state.showInfo,
    });
  }

  onClickAccount = () => {
    this.setState({
      showInfo: !this.state.showInfo,
    });
  }

  getAccountInfo = () => {
    editorUtilities.getAccountInfo().then(resp => {
      this.setState({
        userName: resp.data.name,
        contactEmail: resp.data.email,
        usageRate: resp.data.space_usage,
        quotaUsage: Utils.bytesToSize(resp.data.usage),
        quotaTotal: Utils.bytesToSize(resp.data.total),
        isStaff: resp.data.is_staff,
        isOrgStaff: resp.data.is_org_staff === 1 ? true : false,
        avatarURL: resp.data.avatar_url
      });
    });
  }

  renderMenu = () => {
    if(this.state.isStaff){
      return (
        <a href={siteRoot + 'sys/useradmin/'} title={gettext('System Admin')} className="item">{gettext('System Admin')}</a>
      );
    }
    if (this.state.isOrgStaff) {
      return (
        <a href={siteRoot + 'org/useradmin/'} title={gettext('Organization Admin')} className="item">{gettext('Organization Admin')}</a>
      );
    }
  }

  renderAvatar = () => {
    if (this.state.avatarURL) {
      return (
        <img src={this.state.avatarURL} width="36" height="36" className="avatar" alt={gettext('Avatar')} />
      );
    }
    return (
      <img src="" width="36" height="36" className="avatar" alt={gettext('Avatar')} />
    );
  }

  render() {
    return (
      <div id="account">
        <a id="my-info" onClick={this.onClickAccount} className="account-toggle no-deco d-none d-md-block" aria-label="View profile and more">
          <span><img src={this.state.avatarURL} width="36" height="36" className="avatar" alt={gettext('Avatar')} /></span>
          <span className="fas fa-caret-down vam"></span>
        </a>
        <span className="account-toggle sf2-icon-more mobile-icon d-md-none" aria-label="View profile and more" onClick={this.onClickAccount}></span>
        <div id="user-info-popup" className={`account-popup sf-popover ${this.state.showInfo? '':'hide'}`}>
          <div className="outer-caret up-outer-caret">
            <div className="inner-caret"></div>
          </div>
          <div className="sf-popover-con">
            <div className="item o-hidden">
              {this.renderAvatar()}
              <div className="txt">{this.state.userName}</div>
            </div>
            <div id="space-traffic">
              <div className="item">
                <p>{gettext('Used:')}{' '}{this.state.quotaUsage} / {this.state.quotaTotal}</p>
                <div id="quota-bar"><span id="quota-usage" className="usage" style={{width: this.state.usageRate}}></span></div>
              </div>
            </div>
            <a href={siteRoot + 'profile/'} className="item">{gettext('Settings')}</a>
            {this.renderMenu()}
            <a href={siteRoot + 'accounts/logout/'} className="item">{gettext('Log out')}</a>
          </div>
        </div>
      </div>
    );
  }
}

export default Account;
