import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Link } from '@gatsbyjs/reach-router';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { siteRoot, gettext, lang } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import OrgGroupMemberAuditLog from '../../models/org-logs-group-member-audit';
import UserLink from './user-link';

import '../../css/org-logs.css';

dayjs.locale(lang);

class OrgLogsGroupMemberAudit extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      page: 1,
      perPage: 25,
      pageNext: false,
      eventList: [],
    };
  }

  componentDidMount() {
    let page = this.state.page;
    let perPage = this.state.perPage;
    this.initData(page, perPage);
  }

  initData = (page, perPage) => {
    orgAdminAPI.orgAdminListGroupInvite(page, perPage).then(res => {
      let eventList = res.data.log_list.map(item => {
        return new OrgGroupMemberAuditLog(item);
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
              <th width="20%">{gettext('User')}</th>
              <th width="20%">{gettext('Group')}</th>
              <th width="20%">{gettext('Operator')}</th>
              <th width="20%">{gettext('Action')}</th>
              <th width="20%">{gettext('Date')}</th>
            </tr>
          </thead>
          <tbody>
            {eventList.map((item, index) => {
              return (
                <GroupInviteItem
                  key={index}
                  groupEvent={item}
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
  groupEvent: PropTypes.object.isRequired,
};

class GroupInviteItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
    };
  }

  handleMouseOver = () => {
    this.setState({
      highlight: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      highlight: false
    });
  };

  getActionTextByEType = (operation) => {
    if (operation.indexOf('group_member_add') != -1) {
      return gettext('Add member');
    } else if (operation.indexOf('group_member_delete') != -1) {
      return gettext('Delete member');
    } else {
      return '';
    }
  };

  render() {
    let { groupEvent } = this.props;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''}
        onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td>{<UserLink email={groupEvent.user_email} name={groupEvent.user_name} />}</td>
        <td>{<Link to={`${siteRoot}org/groupadmin/${groupEvent.group_id}/`}>{groupEvent.group_name}</Link>}</td>
        <td>{<UserLink email={groupEvent.operator_email} name={groupEvent.operator_name} />}</td>
        <td>{this.getActionTextByEType(groupEvent.operation)}</td>
        <td>{dayjs(groupEvent.time).fromNow()}</td>
      </tr>
    );
  }
}

GroupInviteItem.propTypes = propTypes;

export default OrgLogsGroupMemberAudit;
