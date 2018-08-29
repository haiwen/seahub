import React from 'react';

class Notification extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showNotice: false,
      notice_html: ''
    }
  
    this.onClick = this.onClick.bind(this);
    this.loadNotices = this.loadNotices.bind(this);
  }

  onClick() {
    this.setState({
      showNotice: !this.state.showNotice
    })
    if (!this.state.showNotice) {
      this.loadNotices()
    }
  }

  loadNotices() {
    this.props.seafileAPI.getPopupNotices().then(
      res => {
        this.setState({
          notice_html: res.data.notice_html
        })
      }) 
  }

  render() {
    return (
      <div id="notifications">
          <a href="#" onClick={this.onClick} className="no-deco" id="notice-icon" title="Notifications" aria-label="Notifications">
              <span className="sf2-icon-bell"></span>
              <span className="num hide">0</span>
          </a>
          <div id="notice-popover" className={`sf-popover ${this.state.showNotice ? '': 'hide'}`}>
            <div className="outer-caret up-outer-caret"><div className="inner-caret"></div></div>
            <div className="sf-popover-hd ovhd">
                <h3 className="sf-popover-title">通知</h3>
                <a href="#" onClick={this.onClick} title="关闭" aria-label="关闭" className="sf-popover-close js-close sf2-icon-x1 op-icon float-right"></a>
            </div>
            <div className="sf-popover-con">
                <ul className="notice-list" dangerouslySetInnerHTML={{__html: this.state.notice_html}}>
                </ul>
                <a href="/notification/list/" className="view-all">查看所有提醒。</a>
            </div>
          </div>
      </div>
    )
  }
}

export default Notification;
