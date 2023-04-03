import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { siteRoot, gettext, appAvatarURL, enableSSOToThirdpartWebsite } from '../../utils/constants';
import toaster from '../toast';

const propTypes = {
  isAdminPanel: PropTypes.bool,
};

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
    };
    this.isFirstMounted = true;
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

  onClickAccount = (e) => {
    e.preventDefault();
    if (this.isFirstMounted) {
      seafileAPI.getAccountInfo().then(resp => {
        this.setState({
          userName: resp.data.name,
          contactEmail: resp.data.email,
          usageRate: resp.data.space_usage,
          quotaUsage: Utils.bytesToSize(resp.data.usage),
          quotaTotal: Utils.bytesToSize(resp.data.total),
          isStaff: resp.data.is_staff,
          isInstAdmin: resp.data.is_inst_admin,
          isOrgStaff: resp.data.is_org_staff === 1 ? true : false,
          showInfo: !this.state.showInfo,
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
      this.isFirstMounted = false;
    } else {
      this.setState({showInfo: !this.state.showInfo});
    }
  }

  renderMenu = () => {
    let data;
    const { isStaff, isOrgStaff, isInstAdmin } = this.state;

    if (this.props.isAdminPanel) {
      if (isStaff) {
        data = {
          url: siteRoot,
          text: gettext('Exit System Admin')
        };
      } else if (isOrgStaff) {
        data = {
          url: siteRoot,
          text: gettext('Exit Organization Admin')
        };
      } else if (isInstAdmin) {
        data = {
          url: siteRoot,
          text: gettext('Exit Institution Admin')
        };
      }

    } else {
      if (isStaff) {
        data = {
          url: `${siteRoot}sys/info/`,
          text: gettext('System Admin')
        };
      } else if (isOrgStaff) {
        data = {
          url: `${siteRoot}org/info/`,
          text: gettext('Organization Admin')
        };
      } else if (isInstAdmin) {
        data = {
          url: `${siteRoot}inst/useradmin/`,
          text: gettext('Institution Admin')
        };
      }
    }

    return data && <a href={data.url} title={data.text} className="item">{data.text}</a>;
  }

  renderAvatar = () => {
    return (<img src={appAvatarURL} width="36" height="36" className="avatar" alt={gettext('Avatar')} />);
  }

  render() {
    return (
      <div id="account">
        <a id="my-info" href="#" onClick={this.onClickAccount} className="account-toggle no-deco d-none d-md-block" aria-label={gettext("View profile and more")}>
          {this.renderAvatar()}
          <span className="fas fa-caret-down vam"></span>
        </a>
        <span className="account-toggle sf2-icon-more mobile-icon d-md-none" aria-label={gettext("View profile and more")} onClick={this.onClickAccount}></span>
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
            {enableSSOToThirdpartWebsite && <a href={siteRoot + 'sso-to-thirdpart/'} className="item">{gettext('Customer Portal')}</a>}
            <a href={siteRoot + 'accounts/logout/'} className="item">{gettext('Log out')}</a>
          </div>
        </div>
      </div>
    );
  }
}

Account.defaultProps = {
  isAdminPanel: false
};

Account.propTypes = propTypes;

export default Account;
