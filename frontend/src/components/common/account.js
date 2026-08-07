import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'reactstrap';
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
      aiCreditUsed: '',
      aiUsageRate: '',
      isStaff: false,
      isOrgStaff: false,
      usageRate: '',
      enableSubscription: false,
    };
    this.isFirstMounted = true;
  }

  toggle = () => {
    this.setState({ showInfo: !this.state.showInfo });
  };

  onClickAccount = (e) => {
    e.preventDefault();
    if (this.isFirstMounted) {
      seafileAPI.getAccountInfo().then(resp => {
        this.setState({
          showInfo: true,
          userName: resp.data.name,
          contactEmail: resp.data.email,
          usageRate: resp.data.space_usage,
          quotaUsage: Utils.bytesToSize(resp.data.usage),
          quotaTotal: Utils.bytesToSize(resp.data.total),
          isStaff: resp.data.is_staff,
          isInstAdmin: resp.data.is_inst_admin,
          isOrgStaff: resp.data.is_org_staff === 1 ? true : false,
          enableSubscription: resp.data.enable_subscription,
          aiCredit: resp.data.ai_credit,
          aiCreditUsed: resp.data.ai_credit_used,
          aiUsageRate: resp.data.ai_usage_rate
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
      this.isFirstMounted = false;
    }
  };

  renderMenu = () => {
    let data;
    const { isStaff, isOrgStaff, isInstAdmin } = this.state;
    const { isAdminPanel = false } = this.props;

    if (isAdminPanel) {
      if (isStaff) {
        data = { url: siteRoot, text: gettext('Exit System Admin') };
      } else if (isOrgStaff) {
        data = { url: siteRoot, text: gettext('Exit Organization Admin') };
      } else if (isInstAdmin) {
        data = { url: siteRoot, text: gettext('Exit Institution Admin') };
      }
    } else {
      if (isStaff) {
        data = { url: `${siteRoot}sys/info/`, text: gettext('System Admin') };
      } else if (isOrgStaff) {
        data = { url: `${siteRoot}org/info/`, text: gettext('Organization Admin') };
      } else if (isPro && isInstAdmin) {
        data = { url: `${siteRoot}inst/useradmin/`, text: gettext('Institution Admin') };
      }
    }

    return data && <a href={data.url} title={data.text} className="item">{data.text}</a>;
  };

  renderAvatar = () => {
    return (<img src={appAvatarURL} width="36" height="36" className="avatar" alt={gettext('Avatar')} />);
  };

  renderDivider = () => {
    return (<div className="account-popup-divider" aria-hidden="true"></div>);
  };

  render() {
    const menuItem = this.renderMenu();
    const isSubscriptionShown = this.state.enableSubscription && !isOrgContext;

    return (
      <div id="account" ref={ref => this.accountDOM = ref} className="ml-3">
        <button id="my-info" type="button" onClick={this.onClickAccount} className="account-toggle no-deco border-0 bg-transparent p-0 d-none d-md-block" aria-label={gettext('View profile and more')}>
          {this.renderAvatar()}
        </button>
        <span className="account-toggle mobile-icon d-md-none" role="button" tabIndex="0" aria-label={gettext('View profile and more')} onClick={this.onClickAccount}>
          <Icon symbol="more-vertical" />
        </span>
        <Popover
          isOpen={this.state.showInfo}
          toggle={this.toggle}
          target="account"
          placement="bottom-end"
          hideArrow={true}
          fade={false}
          trigger="legacy"
          popperClassName="account-popup"
        >
          <div className="item o-hidden">
            {this.renderAvatar()}
            <div className="txt">{this.state.userName}</div>
          </div>
          {this.renderDivider()}
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
                <p>{gettext('AI credit used:')}{' '}{this.state.aiCreditUsed} / {this.state.aiCredit > 0 ? this.state.aiCredit : '--'}</p>
                <div id="quota-bar">
                  <span id="quota-usage" className="usage" style={{ width: this.state.aiUsageRate }}>
                  </span>
                </div>
              </div>
            }
          </div>
          {this.renderDivider()}
          <a href={siteRoot + 'profile/'} className="item">{gettext('Settings')}</a>
          {isSubscriptionShown && this.renderDivider()}
          {isSubscriptionShown && <a href={siteRoot + 'subscription/'} className="item">{'付费管理'}</a>}
          {menuItem && this.renderDivider()}
          {menuItem}
          {enableSSOToThirdpartWebsite && this.renderDivider()}
          {enableSSOToThirdpartWebsite && <a href={siteRoot + 'sso-to-thirdpart/'} className="item">{gettext('Customer Portal')}</a>}
          {this.renderDivider()}
          <a href={siteRoot + 'accounts/logout/'} className="item">{gettext('Log out')}</a>
        </Popover>
      </div>
    );
  }
}

Account.propTypes = propTypes;

export default Account;
