import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { siteRoot, isPro, gettext, appAvatarURL, enableSSOToThirdpartWebsite, enableSeafileAI } from '../../utils/constants';
import toaster from '../toast';
import Icon from '../icon';

const {
  isOrgContext,
} = window.app.pageOptions;

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
      aiCredit: '',
      aiCost: '',
      aiUsageRate: '',
      isStaff: false,
      isOrgStaff: false,
      usageRate: '',
      enableSubscription: false,
    };
    this.isFirstMounted = true;
  }

  componentDidUpdate(prevProps) {
    this.handleProps();
  }

  handleProps = () => {
    if (this.state.showInfo) {
      this.addEvents();
    } else {
      this.removeEvents();
    }
  };

  addEvents = () => {
    ['click', 'touchstart', 'keyup'].forEach(event =>
      document.addEventListener(event, this.handleDocumentClick, true)
    );
  };

  removeEvents = () => {
    ['click', 'touchstart', 'keyup'].forEach(event =>
      document.removeEventListener(event, this.handleDocumentClick, true)
    );
  };

  handleDocumentClick = (e) => {
    if (e && (e.which === 3 || (e.type === 'keyup' && e.which !== Utils.keyCodes.tab))) return;
    if (this.accountDOM && this.accountDOM.contains(e.target) && this.accountDOM !== e.target && (e.type !== 'keyup' || e.which === Utils.keyCodes.tab)) {
      return;
    }

    this.setState({
      showInfo: !this.state.showInfo,
    });
  };

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
          enableSubscription: resp.data.enable_subscription,
          aiCredit: resp.data.ai_credit,
          aiCost: resp.data.ai_cost,
          aiUsageRate: resp.data.ai_usage_rate
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
      this.isFirstMounted = false;
    } else {
      this.setState({ showInfo: !this.state.showInfo });
    }
  };

  renderMenu = () => {
    let data;
    const { isStaff, isOrgStaff, isInstAdmin } = this.state;
    const { isAdminPanel = false } = this.props;

    if (isAdminPanel) {
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
      } else if (isPro && isInstAdmin) {
        data = {
          url: `${siteRoot}inst/useradmin/`,
          text: gettext('Institution Admin')
        };
      }
    }

    return data && <a href={data.url} title={data.text} className="item">{data.text}</a>;
  };

  renderAvatar = () => {
    return (<img src={appAvatarURL} width="36" height="36" className="avatar" alt={gettext('Avatar')} />);
  };

  render() {
    return (
      <div id="account" ref={ref => this.accountDOM = ref} className="ml-4">
        <a id="my-info" href="#" onClick={this.onClickAccount} className="account-toggle no-deco d-none d-md-block" aria-label={gettext('View profile and more')}>
          {this.renderAvatar()}
        </a>
        <span className="account-toggle mobile-icon d-md-none" role="button" tabIndex="0" aria-label={gettext('View profile and more')} onClick={this.onClickAccount}>
          <Icon symbol="more-vertical" />
        </span>
        <div id="user-info-popup" className={`account-popup sf-popover ${this.state.showInfo ? '' : 'hide'}`}>
          <div className="sf-popover-con">
            <div className="item o-hidden">
              {this.renderAvatar()}
              <div className="txt">{this.state.userName}</div>
            </div>
            <div className="item">
              <div className="space-traffic">
                <p>{gettext('Used:')}{' '}{this.state.quotaUsage} / {this.state.quotaTotal}</p>
                <div id="quota-bar">
                  <span id="quota-usage" className="usage" style={{ width: this.state.usageRate }}>
                  </span>
                </div>
              </div>
              {enableSeafileAI &&
                <div className="space-traffic">
                  <p>{gettext('AI credit used:')}{' '}{this.state.aiCost} / {this.state.aiCredit > 0 ? this.state.aiCredit : '--'}</p>
                  <div id="quota-bar">
                    <span id="quota-usage" className="usage" style={{ width: this.state.aiUsageRate }}>
                    </span>
                  </div>
                </div>
              }
            </div>

            <a href={siteRoot + 'profile/'} className="item">{gettext('Settings')}</a>
            {(this.state.enableSubscription && !isOrgContext) && <a href={siteRoot + 'subscription/'} className="item">{'付费管理'}</a>}
            {this.renderMenu()}
            {enableSSOToThirdpartWebsite && <a href={siteRoot + 'sso-to-thirdpart/'} className="item">{gettext('Customer Portal')}</a>}
            <a href={siteRoot + 'accounts/logout/'} className="item">{gettext('Log out')}</a>
          </div>
        </div>
      </div>
    );
  }
}

Account.propTypes = propTypes;

export default Account;
