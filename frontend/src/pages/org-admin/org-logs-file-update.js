import React, { Component } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

import Toast from '../../components/toast';

import { seafileAPI } from '../../utils/seafile-api';
import { siteRoot, gettext, orgID } from '../../utils/constants';
import OrgLogsFileUpdateEvent from '../../models/org-logs-file-update';
import ModalPortal from '../../components/modal-portal';
import FileUpdateDetailDialog from '../../components/dialog/org-logs-file-update-detail';

class OrgLogsFileUpdate extends Component {

  constructor(props) {
    super(props);
    this.state = {
      page: 1,
      pageNext: false,
      eventList: [],
      userSelected: '',
      repoSelected: '',
      isItemFreezed: false, 
      showDetails: false,
      repoID: '',
      commitID: ''
    };
  }

  componentDidMount() {
    let page = this.state.page;
    let email = this.state.userSelected;
    let repoID = this.state.repoSelected;
    this.initData(page, email, repoID);
  }

  initData = (page, email, repoID) => {
    seafileAPI.orgAdminListFileUpdate(page, email, repoID).then(res => {
      let eventList = res.data.event_list.map(item => {
        return new OrgLogsFileUpdateEvent(item);
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

  toggleCancelDetail = () => {
    this.setState({
      showDetails: !this.state.showDetails
    })
  }

  onDetails = (e, fileEvent) => {
    e.preventDefault();
    this.setState({
      showDetails: !this.state.showDetails, 
      repoID: fileEvent.repo_id,
      commitID: fileEvent.repo_commit_id
    })
  }

  render() {
    let eventList = this.state.eventList;
    return (
      <div className="cur-view-content">
        <table>
          <thead>
            <tr>
              <th width="25%">{gettext('User')}</th>
              <th width="17%">{gettext('Date')}</th>
              <th width="25%">{gettext('Library')}</th>
              <th width="33%">{gettext('Action')}</th>
            </tr>
          </thead>
          <tbody>
            {eventList.map((item, index) => {
              return (
                <FileUpdateItem
                  key={index}
                  fileEvent={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem} 
                  onUnfreezedItem={this.onUnfreezedItem}
                  onDetails={this.onDetails}
                />
            )})}
          </tbody>
        </table>
        <div className="paginator">
          {this.state.page != 1 && <a href="#" onClick={(e) => this.onChangePageNum(e, -1)}>{gettext('Previous')}</a>}
          {(this.state.page != 1 && this.state.pageNext) && <span> | </span>}
          {this.state.pageNext && <a href="#" onClick={(e) => this.onChangePageNum(e, 1)}>{gettext('Next')}</a>}
        </div>
        {this.state.showDetails && 
          <ModalPortal>
            <FileUpdateDetailDialog 
              repoID={this.state.repoID}
              commitID={this.state.commitID}
              toggleCancel={this.toggleCancelDetail}
            />
          </ModalPortal>
        }
      </div>
    );
  }
}


class FileUpdateItem extends React.Component {

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

  renderRepo = (fileEvent) => {
    let repoName = 'Deleted';
    if (fileEvent.repo_name) {
      repoName = fileEvent.repo_name; 
    } 
    return repoName; 
  }

  renderAction = (fileEvent) => {
    if (fileEvent.repo_encrypted || !fileEvent.repo_id) {
      return <td>{fileEvent.file_oper}</td>;
    }

    return <td>{fileEvent.file_oper}<a className="font-weight-normal text-muted ml-1" href='#' onClick={(e) => this.props.onDetails(e, fileEvent)}>{gettext('Details')}</a></td>
  }

  render() {
    let { fileEvent } = this.props;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td>{this.renderUser(fileEvent)}</td>
        <td>{fileEvent.local_time}</td>
        <td>{this.renderRepo(fileEvent)}</td>
        {this.renderAction(fileEvent)}
      </tr>
    );
  }
}


export default OrgLogsFileUpdate;
