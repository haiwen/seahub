import React from 'react';
import { curNoteMsg, curNoteID, siteRoot, gettext } from '../utils/constants';

import '../css/system-notification.css';

class SystemNotification extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isClosed: false
    };
  }

  close = () => {
    this.setState({isClosed: true});

    if (navigator.cookieEnabled) {
      let date = new Date(),
        cookies = document.cookie.split('; '),
        infoIDExist = false,
        newInfoID = curNoteID + '_';
      date.setTime(date.getTime() + 14*24*60*60*1000);
      newInfoID += '; expires=' + date.toGMTString() + '; path=' + siteRoot;
      for (var i = 0, len = cookies.length; i < len; i++) {
        if (cookies[i].split('=')[0] == 'info_id') {
          infoIDExist = true;
          document.cookie = 'info_id=' + cookies[i].split('=')[1] + newInfoID;
          break;
        }
      }
      if (!infoIDExist) {
        document.cookie = 'info_id=' + newInfoID;
      }
    }
  }

  render() {
    if (!curNoteMsg || this.state.isClosed) {
      return null;
    }

    return (
      <div id="info-bar">
        <p id="info-bar-info"><span dangerouslySetInnerHTML={{__html: curNoteMsg}}></span></p>
        <span className="close sf2-icon-x1" title={gettext('Close')} onClick={this.close}></span>
      </div>
    );
  }
}

export default SystemNotification;
