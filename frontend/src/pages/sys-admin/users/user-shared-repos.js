import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import classnames from 'classnames';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { isPro, siteRoot, gettext } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import UserLink from '../user-link';

const { enableSysAdminViewRepo } = window.sysadmin.pageOptions;
dayjs.extend(relativeTime);

class Content extends Component {
  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const table = (
        <table>
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
      );
      return items.length ? table : <EmptyTip text={gettext('No libraries')} />;
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false
    };
  }

  handleMouseOver = () => {
    this.setState({
      isHighlighted: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      isHighlighted: false
    });
  };

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
  };

  getOwnerLink = () => {
    let link;
    const { item } = this.props;
    const index = item.owner_email.indexOf('@seafile_group');
    if (index == -1) {
      link = <UserLink email={item.owner_email} name={item.owner_name} />;
    } else {
      const groupID = item.owner_email.substring(0, index);
      link = <Link to={`${siteRoot}sys/groups/${groupID}/libraries/`}>{item.owner_name}</Link>;
    }
    return link;
  };

  render() {
    const { item } = this.props;
    const iconUrl = Utils.getLibIconUrl(item);
    const iconTitle = Utils.getLibIconTitle(item);
    const { isHighlighted } = this.state;
    return (
      <tr
        className={classnames({
          'tr-highlight': isHighlighted
        })}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.handleMouseOut}
      >
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
        <td>{this.renderRepoName()}</td>
        <td>{this.getOwnerLink()}</td>
        <td>{Utils.bytesToSize(item.size)}</td>
        <td>{dayjs(item.last_modify).fromNow()}</td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

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

  componentDidMount() {
    const email = decodeURIComponent(this.props.email);
    systemAdminAPI.sysAdminGetUser(email).then((res) => {
      this.setState({
        userInfo: res.data
      });
    });
    systemAdminAPI.sysAdminListShareInRepos(email).then(res => {
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
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <div className="cur-view-content">
            <Content
              loading={this.state.loading}
              errorMsg={this.state.errorMsg}
              items={this.state.repoList}
            />
          </div>
        </div>
      </div>
    );
  }
}

Repos.propTypes = {
  email: PropTypes.string,
};

export default Repos;
