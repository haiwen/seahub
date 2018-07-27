import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import MarkdownViewer from './markdown-viewer';

const siteRoot = window.app.config.siteRoot;
const avatarInfo = window.app.config.avatarInfo;

const keyCodes = {
  esc:   27,
  space: 32,
  tab:   9,
  up:    38,
  down:  40
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
      usageRate: '',
    }
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
    if (e && (e.which === 3 || (e.type === 'keyup' && e.which !== keyCodes.tab))) return;
    const container = this.getContainer();

    if (container.contains(e.target) && container !== e.target && (e.type !== 'keyup' || e.which === keyCodes.tab)) {
      return;
    }

    this.setState({
      showInfo: !this.state.showInfo,
    })
  }

  onClickAccount = () => {
     this.setState({
       showInfo: !this.state.showInfo,
     })
  }

  getAccountInfo = () => {
    const urll = siteRoot + 'api2/account/info/';
    fetch(urll, {
      credentials: 'same-origin',
      })
      .then(resp => resp.json())
      .then(resp => {
        console.log(resp);
        this.setState({
          userName: resp.name,
          contactEmail: resp.email,
          usageRate: resp.space_usage,
          quotaUsage: this.converQuota(resp.usage),
          quotaTotal: this.converQuota(resp.total),
          isStaff: resp.is_staff
        })
      })
  }

  converQuota = (limit) => {
  		let size = "";
  		if( limit < 0.1 * 1000 ){
  			size = limit.toFixed(1) + " Bytes";
  		}else if(limit < 0.1 * 1000 * 1000 ){
  			size = (limit / 1024).toFixed(1) + " KB";
  		}else if(limit < 0.1 * 1000 * 1000 * 1000){
  			size = (limit / (1000 * 1000)).toFixed(1) + " MB";
  		}else{
  			size = (limit / (1000 * 1000 * 1000)).toFixed(1) + " GB";
  		}

  		let sizestr = size + "";
  		let len = sizestr.indexOf("\.");
  		let dec = sizestr.substr(len + 1, 2);
  		if(dec == "00"){
  			return sizestr.substring(0,len) + sizestr.substr(len + 3,2);
  		}
  		return sizestr;
  	}

  renderMenu = () => {
    if(this.state.isStaff){
      return (
        <a href={siteRoot + 'sys/useradmin/'} title="System Admin" className="item">System Admin</a>
      )
    }
  }

  render() {
    return (
      <div id="account">
        <a id="my-info" onClick={this.onClickAccount} className="account-toggle no-deco d-none d-md-block" aria-label="View profile and more">
         <span  dangerouslySetInnerHTML = {{ __html:avatarInfo }}></span> <span className="icon-caret-down vam"></span>
        </a>
        <span className="account-toggle sf2-icon-more mobile-icon d-md-none" aria-label="View profile and more" onClick={this.onClickAccount}></span>
        <div id="user-info-popup" className={`account-popup sf-popover ${this.state.showInfo? '':'hide'}`}>
         <div className="outer-caret up-outer-caret"><div className="inner-caret"></div></div>
         <div className="sf-popover-con">
           <div className="item o-hidden">
             <span  dangerouslySetInnerHTML = {{ __html:avatarInfo }}></span>
             <div className="txt">
              {this.state.userName} <br/>
              {this.state.contactEmail}
             </div>
           </div>
           <div id="space-traffic">
             <div className="item">
               <p>Used: {this.state.quotaUsage} / {this.state.quotaTotal}</p>
               <div id="quota-bar">
                <span id="quota-usage" className="usage" style={{width: this.state.usageRate}}></span>
               </div>
             </div>
           </div>
           <a href={siteRoot + 'profile/'} className="item">Settings</a>
           {this.renderMenu()}
           <a href={siteRoot + 'accounts/logout/'} className="item" id="logout">Log out</a>
         </div>
        </div>
      </div>
    )
  }
}

export default Account;
