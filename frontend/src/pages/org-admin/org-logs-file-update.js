import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { siteRoot, gettext, lang } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import OrgLogsFileUpdateEvent from '../../models/org-logs-file-update';
import ModalPortal from '../../components/modal-portal';
import FileUpdateDetailDialog from '../../components/dialog/org-logs-file-update-detail';
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
    this.initData(email, repoID, page);
  }

  initData = (email, repoID, page) => {
    seafileAPI.orgAdminListFileUpdate(email, repoID, page).then(res => {
      let eventList = res.data.log_list.map(item => {
        return new OrgLogsFileUpdateEvent(item);
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
    let email = this.state.userSelected;
    let repoID = this.state.repoSelected;
    this.initData(email, repoID, page);
  }

  toggleCancelDetail = () => {
    this.setState({
      showDetails: !this.state.showDetails
    });
  }

  onDetails = (e, fileEvent) => {
    e.preventDefault();
    this.setState({
      showDetails: !this.state.showDetails,
      repoID: fileEvent.repo_id,
      commitID: fileEvent.repo_commit_id
    });
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
                  onDetails={this.onDetails}
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

const propTypes = {
  filterUser: PropTypes.func.isRequired,
  filterRepo: PropTypes.func.isRequired,
  onDetails: PropTypes.func.isRequired,
  userSelected: PropTypes.string.isRequired,
  repoSelected: PropTypes.string.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
};


class FileUpdateItem extends React.Component {

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
              {gettext('Only Show')}{' '}<span className="font-weight-bold">{fileEvent.user_name}</span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </span>
    );
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
                {gettext('Only Show')}{' '}
                <span className="font-weight-bold">{fileEvent.repo_name}</span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        }
      </span>
    );
  }

  renderAction = (fileEvent) => {
    if (fileEvent.repo_encrypted || !fileEvent.repo_id) {
      return <td>{fileEvent.description}</td>;
    }

    return (
      <td>{fileEvent.description}
        <a className="font-weight-normal text-muted ml-1" href='#'
          onClick={(e) => this.props.onDetails(e, fileEvent)}>{gettext('Details')}</a>
      </td>
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
          <td>{moment(fileEvent.time).format('YYYY-MM-DD HH:mm:ss')}</td>
          <td>{this.renderRepo(fileEvent)}</td>
          {this.renderAction(fileEvent)}
        </tr>
      );
    }
  }
}

FileUpdateItem.propTypes = propTypes;

export default OrgLogsFileUpdate;
