import React, { Component } from 'react';

class Header extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showInfo: false
    }
  }

  onClickAccount = () => {
    this.setState({
      showInfo: !this.state.showInfo
    })
  }

  render() {
    return (
      <div id="header" className="d-flex">
        <a id="logo" className='d-none d-md-block'>
          <img src="/media/img/seafile-logo.png" title="Private Seafile" alt="logo" width="128" height="32" />
        </a>
        <span className="sf2-icon-menu side-nav-toggle d-md-none" title="Side Nav Menu" id="js-toggle-side-nav" aria-label="Side Nav Menu"></span>
        <div className="d-flex">
          <div id="account">
            <a id="my-info" onClick={this.onClickAccount} href="#" className="account-toggle no-deco d-none d-md-block" aria-label="View profile and more">
              <img src="/media/avatars/d/2/19af79b45e5891507fda4c4c2139a0/resized/72/d2596b6ff63e13a4953ce0c7a40e520a.png" width="36" height="36" className="avatar" /> <span className="icon-caret-down vam"></span>
            </a>
            <span className="account-toggle sf2-icon-more mobile-icon d-md-none" aria-label="View profile and more"></span>
            <div id="user-info-popup" className={`account-popup sf-popover ${this.state.showInfo? '':'hide'}`}>
             <div className="outer-caret up-outer-caret"><div className="inner-caret"></div></div>
             <div className="sf-popover-con">
               <div className="item ovhd">
                 <div className="txt">
                 </div>
               </div>
               <span className="loading-icon loading-tip"></span>
               <div id="space-traffic" className="hide" data-url=""></div>
               <a className="item">Settings</a>
               <a title="System Admin" className="item">System Admin</a>
               <a title="Admin" className="item">Organization Admin</a>
               <a className="item" id="logout">Log out</a>
             </div>
            </div>
          </div>
        </div>       
      </div>
    )
  }
}

export default Header;
