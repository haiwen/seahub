import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { siteRoot, gettext, lang } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import OrgLogsFileAuditEvent from '../../models/org-logs-file-audit';
import '../../css/org-logs.css';

moment.locale(lang);

class OrgLogsFileAudit extends React.Component {

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
    seafileAPI.orgAdminListFileAudit(email, repoID, page).then(res => {
      let eventList = res.data.log_list.map(item => {
        return new OrgLogsFileAuditEvent(item);
      });

      this.setState({
        eventList: eventList,
        pageNext: res.data.page_next,
        page: res.data.page,
        userSelected: res.data.user_selected,
        repoSelected: res.data.repo_selected
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
    let email = this.state.userSelected;
    let repoID = this.state.repoSelected;
    this.initData(email, repoID, page);
  }

  filterUser = (userSelected) => {
    this.setState({ userSelected: userSelected });
  }

  filterRepo = (repoSelected) => {
    this.setState({ repoSelected: repoSelected });
  }

  render() {
    let eventList = this.state.eventList;
    return (
      <div className="cur-view-content">
        {
          (this.state.userSelected || this.state.repoSelected) &&
          <React.Fragment>
            {this.state.userSelected &&
              <span className="audit-unselect-item" onClick={this.filterUser.bind(this, null)}>
                <span className="no-deco">{this.state.userSelected}</span>{' ✖'}
              </span>
            }
            {this.state.repoSelected &&
              <span className="audit-unselect-item" onClick={this.filterRepo.bind(this, null)}>
                <span className="no-deco">{this.state.repoSelected}</span>{' ✖'}
              </span>
            }
          </React.Fragment>
        }
        <table>
          <thead>
            <tr>
              <th width="24%">{gettext('User')}</th>
              <th width="10%">{gettext('Type')}</th>
              <th width="13%">{gettext('IP')}</th>
              <th width="17%">{gettext('Date')}</th>
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
                  filterUser={this.filterUser}
                  filterRepo={this.filterRepo}
                  userSelected={this.state.userSelected}
                  repoSelected={this.state.repoSelected}
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
  filterRepo: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  fileEvent: PropTypes.object.isRequired,
  userSelected: PropTypes.string,
  repoSelected: PropTypes.string,
};

class FileAuditItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      isItemMenuShow: false,
      userDropdownOpen: false,
      repoDropdownOpen: false,
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

  toggleUserDropdown = () => {
    this.setState({ userDropdownOpen: !this.state.userDropdownOpen });
  }

  renderUser = (fileEvent) => {
    if (!fileEvent.user_email) {
      return gettext('Anonymous User');
    }

    return (
      <span>
        <a href={siteRoot + 'org/useradmin/info/' + fileEvent.user_email + '/'}>{fileEvent.user_name}</a>{' '}
        <Dropdown size='sm' isOpen={this.state.userDropdownOpen} toggle={this.toggleUserDropdown}
          className={this.state.highlight ? '' : 'vh'} tag="span">
          <DropdownToggle tag="i" className="sf-dropdown-toggle sf2-icon-caret-down"></DropdownToggle>
          <DropdownMenu>
            <DropdownItem onClick={this.props.filterUser.bind(this, fileEvent.user_email)}>
              {gettext('Only Show')}{' '}
              <span className="font-weight-bold">{fileEvent.user_name}</span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </span>
    );

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

  toggleRepoDropdown = () => {
    this.setState({ repoDropdownOpen: !this.state.repoDropdownOpen });
  }

  renderRepo = (fileEvent) => {
    let repoName = 'Deleted';
    if (fileEvent.repo_name) {
      repoName = fileEvent.repo_name;
    }
    return (
      <span>
        <span>{repoName}</span>
        { fileEvent.repo_name &&
          <Dropdown size='sm' isOpen={this.state.repoDropdownOpen} toggle={this.toggleRepoDropdown}
            className={this.state.highlight ? '' : 'vh'} >
            <DropdownToggle tag="i" className="sf-dropdown-toggle sf2-icon-caret-down"></DropdownToggle>
            <DropdownMenu>
              <DropdownItem size='sm' onClick={this.props.filterRepo.bind(this, fileEvent.repo_name)}>
                {gettext('Only Show')}{' '}<span className="font-weight-bold">{fileEvent.repo_name}</span></DropdownItem>
            </DropdownMenu>
          </Dropdown>
        }
      </span>
    );
  }

  render() {
    let { fileEvent } = this.props;
    if (this.props.userSelected && fileEvent.user_email !== this.props.userSelected ) {
      return null;
    } else if (this.props.repoSelected && fileEvent.repo_name !== this.props.repoSelected) {
      return null;
    } else {
      return (
        <tr className={this.state.highlight ? 'tr-highlight' : ''}
          onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td>{this.renderUser(fileEvent)}</td>
          <td>{this.renderType(fileEvent.type)}</td>
          <td>{fileEvent.ip}</td>
          <td>{moment(fileEvent.time).format('YYYY-MM-DD HH:mm:ss')}</td>
          <td>{this.renderRepo(fileEvent)}</td>
          <td><span title={fileEvent.file_path}>{fileEvent.file_name}</span></td>
        </tr>
      );
    }
  }
}

FileAuditItem.propTypes = propTypes;

export default OrgLogsFileAudit;
