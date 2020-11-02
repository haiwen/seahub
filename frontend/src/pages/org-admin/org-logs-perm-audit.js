import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { siteRoot, gettext, lang } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import OrgLogsFilePermEvent from '../../models/org-logs-perm-audit';
import '../../css/org-logs.css';

moment.locale(lang);

class OrgLogsFileUpdate extends Component {

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
    this.initData(email, repoID, page);
  }

  initData = (email, repoID, page) => {
    seafileAPI.orgAdminListPermAudit(email, repoID, page).then(res => {
      let eventList = res.data.log_list.map(item => {
        return new OrgLogsFilePermEvent(item);
      });

      this.setState({
        eventList: eventList,
        pageNext: res.data.page_next,
        page: res.data.page,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
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

  filterUser = (userSelected) => {
    this.setState({ userSelected: userSelected });
  }

  render() {
    let eventList = this.state.eventList;
    return (
      <div className="cur-view-content">
        {this.state.userSelected &&
          <span className="audit-unselect-item" onClick={this.filterUser.bind(this, null)}>
            <span className="no-deco">{this.state.userSelected}</span>{' ✖'}
          </span>
        }
        <table>
          <thead>
            <tr>
              <th width="18%">{gettext('Share From')}</th>
              <th width="15%">{gettext('Share To')}</th>
              <th width="8%">{gettext('Actions')}</th>
              <th width="13%">{gettext('Permission')}</th>
              <th width="15%">{gettext('Library')}</th>
              <th width="15%">{gettext('Folder')}</th>
              <th width="16%">{gettext('Date')}</th>
            </tr>
          </thead>
          <tbody>
            {eventList.map((item, index) => {
              return (
                <PermAuditItem
                  key={index}
                  permEvent={item}
                  isItemFreezed={this.state.isItemFreezed}
                  filterUser={this.filterUser}
                  userSelected={this.state.userSelected}
                />
              );
            })}
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


const propTypes = {
  filterUser: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  userSelected: PropTypes.string.isRequired,
  permEvent: PropTypes.object.isRequired,
};

class PermAuditItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      isItemMenuShow: false,
      userDropdownOpen: false,
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

  renderFromUser = (permEvent) => {
    if (!permEvent.from_user_email) {
      return gettext('Anonymous User');
    }
    return (
      <span>
        <a href={siteRoot + 'org/useradmin/info/' + permEvent.from_user_email + '/'}>{permEvent.from_user_name}</a>{' '}
        <Dropdown size='sm' isOpen={this.state.userDropdownOpen} toggle={this.toggleUserDropdown}
          className={this.state.highlight ? '' : 'vh'} tag="span">
          <DropdownToggle tag="i" className="sf-dropdown-toggle sf2-icon-caret-down"></DropdownToggle>
          <DropdownMenu>
            <DropdownItem onClick={this.props.filterUser.bind(this, permEvent.from_user_email)}>
              {gettext('Only Show')}{' '}
              <span className="font-weight-bold">{permEvent.from_user_name}</span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </span>
    );
  }

  toggleUserDropdown = () => {
    this.setState({ userDropdownOpen: !this.state.userDropdownOpen });
  }

  renderToUser = (permEvent) => {
    if (permEvent.type.indexOf('public') != -1) {
      return <a href={siteRoot + 'org/'}>{gettext('Organization')}</a>;
    }

    if (permEvent.type.indexOf('group') != -1) {
      if (permEvent.to_group_name) {
        return <a href={siteRoot + 'org/groupadmin/' + permEvent.to_group_id + '/'}>{permEvent.to_group_name}</a>;
      }
      return 'Deleted';
    }

    if (permEvent.type.indexOf('user') != -1) {
      return <a href={siteRoot + 'org/useradmin/info/' + permEvent.to_user_email + '/'}>{permEvent.to_user_name}</a>;
    }

  }

  renderType = (type) => {
    if (type.indexOf('add') != -1) {
      type = 'Add';
    }
    if (type.indexOf('modify') != -1) {
      type = 'Modify';
    }
    if (type.indexOf('delete') != -1) {
      type = 'Delete';
    }
    return type;
  }

  renderRepo = (permEvent) => {
    let repoName = 'Deleted';
    if (permEvent.repo_name) {
      repoName = permEvent.repo_name;
    }
    return repoName;
  }

  renderFolder = (name) => {
    let folderName = '/';
    if (name) {
      folderName = name;
    }
    return folderName;
  }

  render() {
    let { permEvent } = this.props;
    if (this.props.userSelected && permEvent.from_user_email !== this.props.userSelected ) {
      return null;
    } else {
      return (
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td>{this.renderFromUser(permEvent)}</td>
          <td>{this.renderToUser(permEvent)}</td>
          <td>{this.renderType(permEvent.type)}</td>
          <td>{Utils.sharePerms(permEvent.permission)}</td>
          <td>{this.renderRepo(permEvent)}</td>
          <td>{this.renderFolder(permEvent.folder_name)}</td>
          <td>{moment(permEvent.time).format('YYYY-MM-DD HH:mm:ss')}</td>
        </tr>
      );
    }
  }
}

PermAuditItem.propTypes = propTypes;

export default OrgLogsFileUpdate;
