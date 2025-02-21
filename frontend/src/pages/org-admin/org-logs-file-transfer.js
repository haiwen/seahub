import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { siteRoot, gettext, lang } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import OrgLogsFileTransferEvent from '../../models/org-logs-file-transfer';
import '../../css/org-logs.css';
import UserLink from './user-link';
import { Link } from '@gatsbyjs/reach-router';

dayjs.locale(lang);

class OrgLogsFileTransfer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      page: 1,
      perPage: 25,
      pageNext: false,
      eventList: [],
      isItemFreezed: false
    };
  }

  componentDidMount() {
    let page = this.state.page;
    let perPage = this.state.perPage;
    this.initData(page, perPage);
  }

  initData = (page, perPage) => {
    orgAdminAPI.orgAdminListFileTransfer(page, perPage).then(res => {
      let eventList = res.data.log_list.map(item => {
        return new OrgLogsFileTransferEvent(item);
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
  };


  onChangePageNum = (e, num) => {
    e.preventDefault();
    let page = this.state.page;
    let perPage = this.state.perPage;
    if (num == 1) {
      page = page + 1;
    } else {
      page = page - 1;
    }
    this.initData(page, perPage);
  };

  render() {
    let eventList = this.state.eventList;
    return (
      <div className="cur-view-content">
        <table>
          <thead>
            <tr>
              <th width="20%">{gettext('Transfer From')}</th>
              <th width="20%">{gettext('Transfer To')}</th>
              <th width="20%">{gettext('Operator')}</th>
              <th width="25%">{gettext('Library')}</th>
              <th width="15%">{gettext('Date')}</th>
            </tr>
          </thead>
          <tbody>
            {eventList.map((item, index) => {
              return (
                <FileTransferItem
                  key={index}
                  fileEvent={item}
                  isItemFreezed={this.state.isItemFreezed}
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
  isItemFreezed: PropTypes.bool.isRequired,
  fileEvent: PropTypes.object.isRequired,
};

class FileTransferItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      isItemMenuShow: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: true,
        highlight: true,
      });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: false,
        highlight: false
      });
    }
  };


  getTransferTo = (item) => {
    switch (item.to_type) {
      case 'user':
        return <UserLink email={item.to_user_email} name={item.to_user_name} />;
      case 'group':
        return <Link to={`${siteRoot}org/groupadmin/${item.to_group_id}/`}>{item.to_group_name}</Link>;
      default:
        return gettext('Deleted');
    }
  };

  getTransferFrom = (item) => {
    switch (item.from_type) {
      case 'user':
        return <UserLink email={item.from_user_email} name={item.from_user_name} />;
      case 'group':
        return <Link to={`${siteRoot}org/groupadmin/${item.from_group_id}/`}>{item.from_group_name}</Link>;
      default:
        return gettext('Deleted');
    }
  };

  getOperator = (item) => {
    return <UserLink email={item.operator_email} name={item.operator_name} />;
  };

  render() {
    let { fileEvent } = this.props;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''}
        onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td>{this.getTransferFrom(fileEvent)}</td>
        <td>{this.getTransferTo(fileEvent)}</td>
        <td>{this.getOperator(fileEvent)}</td>
        <td>{fileEvent.repo_name ? fileEvent.repo_name : gettext('Deleted')}</td>
        <td>{dayjs(fileEvent.time).fromNow()}</td>
      </tr>
    );
  }
}

FileTransferItem.propTypes = propTypes;

export default OrgLogsFileTransfer;
