import React, { Component } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

import Toast from '../../components/toast';

import { seafileAPI } from '../../utils/seafile-api';
import { siteRoot, gettext, orgID } from '../../utils/constants';
import OrgLogsFileAuditEvent from '../../models/org-logs-file-audit';

class OrgLogsFileAudit extends Component {

  constructor(props) {
    super(props);
    this.state = {
      page: 1,
      pageNext: false,
      eventList: [],
      userSelected: '',
      repoSelected: '',
      isItemFreezed: false  
    };
  }

  componentDidMount() {
    let page = this.state.page;
    let email = this.state.userSelected;
    let repoID = this.state.repoSelected;
    this.initData(page, email, repoID);
  }

  initData = (page, email, repoID) => {
    seafileAPI.orgAdminListFileAudit(page, email, repoID).then(res => {
      let eventList = res.data.event_list.map(item => {
        return new OrgLogsFileAuditEvent(item);
      });

      this.setState({
        eventList: eventList,
        pageNext: res.data.page_next,
        page: res.data.page,
        userSelected: res.data.user_selected,
        repoSelected: res.data.repo_selected
      })
    });
  }


  onChangePageNum = (e, num) => {
    e.preventDefault();
    let page = this.state.page;

    if (num == 1) {
      page = page + 1;
    } else {
      page = page - 1;
    }
    this.initData(page);
  } 

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  render() {
    let eventList = this.state.eventList;
    return (
      <div className="cur-view-content">
        <table>
          <thead>
            <tr>
              <th width="24%">{gettext('User')}</th>
              <th width="10%">{gettext('Type')}</th>
              <th width="15%">{gettext('IP')}</th>
              <th width="15%">{gettext('Date')}</th>
              <th width="18%">{gettext('Library')}</th>
              <th width="18%">{gettext('File')}</th>
            </tr>
          </thead>
          <tbody>
            {eventList.map((item, index) => {
              return (
                <FileAuditItem
                  key={index}
                  fileEvent={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem} 
                  onUnfreezedItem={this.onUnfreezedItem}
                />
            )})}
          </tbody>
        </table>
        <div className="paginator">
          {this.state.page != 1 && <a href="#" onClick={(e) => this.onChangePageNum(e, -1)}>{gettext('Previous')}</a>}
          {(this.state.page != 1 && this.state.pageNext) && <span> | </span>}
          {this.state.pageNext && <a href="#" onClick={(e) => this.onChangePageNum(e, 1)}>{gettext('Next')}</a>}
        </div>
      </div>
    );
  }
}


class FileAuditItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      isItemMenuShow: false
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: true,
        highlight: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: false,
        highlight: false
      });
    }
  } 

  renderUser = (fileEvent) => {
    if (!fileEvent.user_email) { 
      return gettext('Anonymous User');
    }
    
    if (!fileEvent.is_org_user) {
      return fileEvent.user_name;
    }

    return <a href={siteRoot + 'org/useradmin/info/' + fileEvent.user_email + '/'}>{fileEvent.user_name}</a>;
  }

  renderType = (type) => {
    if (type.indexOf('web') != -1) {
      type = 'web'; 
    }
    if (type.indexOf('api') != -1) {
      type = 'api'; 
    }
    if (type.indexOf('share-link') != -1) {
      type = 'share link'; 
    }
    return type;
  } 

  renderRepo = (fileEvent) => {
    let repoName = 'Deleted';
    if (fileEvent.repo_name) {
      repoName = fileEvent.repo_name; 
    } 
    return repoName; 
  }

  render() {
    let { fileEvent } = this.props;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td>{this.renderUser(fileEvent)}</td>
        <td>{this.renderType(fileEvent.type)}</td>
        <td>{fileEvent.ip}</td>
        <td>{fileEvent.time}</td>
        <td>{this.renderRepo(fileEvent)}</td>
        <td><span title={fileEvent.file_path}>{fileEvent.file_name}</span></td>
      </tr>
    );
  }
}

export default OrgLogsFileAudit;
