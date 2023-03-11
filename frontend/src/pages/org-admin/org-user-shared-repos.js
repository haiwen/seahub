import React, { Component, Fragment } from 'react';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import OrgAdminUserNav from '../../components/org-admin-user-nav';
import MainPanelTopbar from './main-panel-topbar';

import '../../css/org-admin-user.css';

const { orgID } = window.org.pageOptions;

class OrgUserSharedRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: ''
    };
  }

  componentDidMount() {
    const email = decodeURIComponent(this.props.email);
    seafileAPI.orgAdminGetOrgUserBesharedRepos(orgID, email).then((res) => {
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
            <OrgAdminUserNav email={this.props.email} currentItem='shared-repos' />
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
      loading, errorMsg, repo_list
    } = this.props.data;

    if (loading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    }

    return (
      <table className="table-hover">
        <thead>
          <tr>
            <th width="4%">{/*icon*/}</th>
            <th width="30%">{gettext('Name')}</th>
            <th width="26%">{gettext('Owner')}</th>
            <th width="15%">{gettext('Size')}</th>
            <th width="25%">{gettext('Last Update')}</th>
          </tr>
        </thead>
        <tbody>
          {repo_list.map((item, index) => {
            return <Item key={index} data={item} />;
          })}
        </tbody>
      </table>
    );
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const repo = this.props.data;
    return (
      <tr>
        <td>
          <img src={Utils.getLibIconUrl(repo, false)} alt={Utils.getLibIconTitle(repo)} title={Utils.getLibIconTitle(repo)} width="24" />
        </td>
        <td>{repo.repo_name}</td>
        <td>{repo.owner_name}</td>
        <td>{Utils.bytesToSize(repo.size)}</td>
        <td title={moment(repo.last_modified).format('LLLL')}>{moment(repo.last_modified).format('YYYY-MM-DD')}</td>
      </tr>
    );
  }
}

export default OrgUserSharedRepos;
