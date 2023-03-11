import React, { Component, Fragment } from 'react';
import { Link } from '@gatsbyjs/reach-router';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { isPro, siteRoot, gettext } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import Nav from './user-nav';

const { enableSysAdminViewRepo } = window.sysadmin.pageOptions;

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No libraries')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="5%"></th>
                <th width="35%">{gettext('Name')}</th>
                <th width="20%">{gettext('Share From')}</th>
                <th width="20%">{gettext('Size')}</th>
                <th width="20%">{gettext('Last Update')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                />);
              })}
            </tbody>
          </table>
        </Fragment>
      );
      return items.length ? table : emptyTip;
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
  }

  renderRepoName = () => {
    const { item } = this.props;
    const repo = item;
    if (repo.name) {
      if (isPro && enableSysAdminViewRepo && !repo.encrypted) {
        return <Link to={`${siteRoot}sys/libraries/${repo.id}/`}>{repo.name}</Link>;
      } else {
        return repo.name;
      }
    } else {
      return gettext('Broken ({repo_id_placeholder})')
        .replace('{repo_id_placeholder}', repo.id);
    }
  }

  getOwnerLink = () => {
    let link;
    const { item } = this.props;
    const index = item.owner_email.indexOf('@seafile_group');
    if (index == -1) {
      link = <UserLink email={item.owner_email} name={item.owner_name} />;
    } else {
      const groupID = item.owner_email.substring(0, index);
      link = <Link to={`${siteRoot}sys/departments/${groupID}/`}>{item.owner_name}</Link>;
    }
    return link;
  }

  render() {
    const { item } = this.props;
    const iconUrl = Utils.getLibIconUrl(item);
    const iconTitle = Utils.getLibIconTitle(item);
    return (
      <Fragment>
        <tr>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{this.renderRepoName()}</td>
          <td>{this.getOwnerLink()}</td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td>{moment(item.last_modify).fromNow()}</td>
        </tr>
      </Fragment>
    );
  }
}

class Repos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userInfo: {},
      repoList: []
    };
  }

  componentDidMount () {
    const email = decodeURIComponent(this.props.email);
    seafileAPI.sysAdminGetUser(email).then((res) => {
      this.setState({
        userInfo: res.data
      });
    });
    seafileAPI.sysAdminListShareInRepos(email).then(res => {
      this.setState({
        loading: false,
        repoList: res.data.repo_list
      });
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
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <Nav currentItem="shared-repos" email={this.props.email} userName={this.state.userInfo.name} />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repoList}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Repos;
