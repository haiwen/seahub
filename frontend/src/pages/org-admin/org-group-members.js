import React, { Component, Fragment } from 'react';
import { Link } from '@gatsbyjs/reach-router';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import OrgAdminGroupNav from '../../components/org-admin-group-nav';
import MainPanelTopbar from './main-panel-topbar';

import '../../css/org-admin-user.css';

const { orgID } = window.org.pageOptions;

class OrgGroupMembers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: ''
    };
  }

  componentDidMount() {
    seafileAPI.orgAdminListGroupMembers(orgID, this.props.groupID).then((res) => {
      this.setState(Object.assign({
        loading: false
      }, res.data));
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgAdminGroupNav groupID={this.props.groupID} currentItem='members' />
            <div className="cur-view-content">
              <Content
                data={this.state}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const {
      loading, errorMsg, members
    } = this.props.data;

    if (loading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <p className="error text-center mt-2">{errorMsg}</p>;
    }

    return (
      <Fragment>
        <table className="table-hover">
          <thead>
            <tr>
              <th width="10%"></th>
              <th width="50%">{gettext('Name')}</th>
              <th width="40%">{gettext('Role')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((item, index) => {
              return <Item key={index} data={item} />;
            })}
          </tbody>
        </table>
      </Fragment>
    );
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
  }

  getRoleText() {
    switch (this.props.data.role) {
      case 'Owner':
        return gettext('Owner');
      case 'Admin':
        return gettext('Admin');
      case 'Member':
        return gettext('Member');
    }
  }

  render() {
    const item = this.props.data;
    return (
      <Fragment>
        <tr>
          <td className="text-center">
            <img src={item.avatar_url} alt="" className="avatar" width="32" />
          </td>
          <td>
            <Link to={`${siteRoot}org/useradmin/info/${encodeURIComponent(item.email)}/`}>{item.name}</Link>
          </td>
          <td>
            {this.getRoleText()}
          </td>
        </tr>
      </Fragment>
    );
  }
}

export default OrgGroupMembers;
