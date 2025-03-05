import React from 'react';
import { createRoot } from 'react-dom/client';
import { siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import SideNav from './components/user-settings/side-nav';
import Account from './components/common/account';
import Notification from './components/common/notification';
import Subscription from './components/subscription';

import './css/toolbar.css';
import './css/search.css';
import './css/user-settings.css';


class UserSubscription extends React.Component {

  constructor(props) {
    super(props);
    this.sideNavItems = [
      { show: true, href: '#current-plan', text: '当前版本' },
      { show: true, href: '#asset-quota', text: '空间' },
      { show: true, href: '#current-subscription-period', text: '订阅有效期' },
      { show: true, href: '#product-price', text: '云服务付费方案' },
    ];
    this.state = {
      curItemID: this.sideNavItems[0].href.substr(1),
    };
  }

  handleContentScroll = (e) => {
    // Mobile does not display the sideNav, so when scrolling don't update curItemID
    const scrollTop = e.target.scrollTop;
    const scrolled = this.sideNavItems.filter((item, index) => {
      return item.show && document.getElementById(item.href.substr(1)).offsetTop - 45 < scrollTop;
    });
    if (scrolled.length) {
      this.setState({
        curItemID: scrolled[scrolled.length - 1].href.substr(1)
      });
    }
  };

  render() {
    let logoUrl = logoPath.startsWith('http') ? logoPath : mediaUrl + logoPath;
    return (
      <div className="h-100 d-flex flex-column">
        <div className="top-header d-flex justify-content-between">
          <a href={siteRoot}>
            <img src={logoUrl} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
          </a>
          <div className="common-toolbar">
            <Notification />
            <Account />
          </div>
        </div>
        <div className="flex-auto d-flex o-hidden">
          <div className="side-panel o-auto">
            <SideNav data={this.sideNavItems} curItemID={this.state.curItemID} />
          </div>
          <div className="main-panel d-flex flex-column">
            <h2 className="heading">{'付费管理'}</h2>
            <Subscription isOrgContext={false} handleContentScroll={this.handleContentScroll}/>
          </div>
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<UserSubscription />);
