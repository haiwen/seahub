import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@reach/router';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Repo from '../../models/repo';
import { gettext, siteRoot, loginUrl, isPro } from '../../utils/constants';
import Loading from '../../components/loading';
import ModalPotal from '../../components/modal-portal';
import ShareDialog from '../../components/dialog/share-dialog';

class Content extends Component {

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  render() {
    const { loading, errorMsg, items, sortBy, sortOrder } = this.props;
    
    const emptyTip = (
      <div className="empty-tip">
        <h2>{gettext('No libraries have been shared with you')}</h2>
        <p>{gettext('No libraries have been shared directly with you. You can find more shared libraries at "Shared with groups".')}</p>
      </div>
    );

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      // sort
      const sortByName = sortBy == 'name';
      const sortByTime = sortBy == 'time';
      const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

      const desktopThead = (
        <thead>
          <tr>
            <th width="4%"><span className="sr-only">{gettext('Library Type')}</span></th>
            <th width="38%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
            <th width="10%"><span className="sr-only">{gettext('Actions')}</span></th>
            <th width="14%">{gettext('Size')}</th>
            <th width="18%"><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortByTime && sortIcon}</a></th>
            <th width="16%">{gettext('Owner')}</th>
          </tr>
        </thead>
      );

      const mobileThead = (
        <thead>
          <tr>
            <th width="18%"><span className="sr-only">{gettext('Library Type')}</span></th>
            <th width="76%">
              {gettext('Sort:')}
              <a className="table-sort-op" href="#" onClick={this.sortByName}>{gettext('name')} {sortByName && sortIcon}</a>
              <a className="table-sort-op" href="#" onClick={this.sortByTime}>{gettext('last update')} {sortByTime && sortIcon}</a>
            </th>
            <th width="6%"><span className="sr-only">{gettext('Actions')}</span></th>
          </tr>
        </thead>
      );

      const table = (
        <table>
          {window.innerWidth >= 768 ? desktopThead : mobileThead}
          <TableBody items={items} />
        </table>
      );

      return items.length ? table : emptyTip; 
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired
};

class TableBody extends Component {

  render() {

    let listItems = this.props.items.map(function(item, index) {
      return <Item key={index} data={item} />;
    }, this);

    return (
      <tbody>{listItems}</tbody>
    );
  }
}

TableBody.propTypes = {
  items: PropTypes.array.isRequired
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      unshared: false,
      isShowSharedDialog: false,
    };

    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);

    this.share = this.share.bind(this);
    this.leaveShare = this.leaveShare.bind(this);
  }

  handleMouseOver() {
    this.setState({
      showOpIcon: true
    });
  }

  handleMouseOut() {
    this.setState({
      showOpIcon: false
    });
  }

  share(e) {
    e.preventDefault();
    this.setState({isShowSharedDialog: true});
  }

  leaveShare(e) {
    e.preventDefault();

    const data = this.props.data;

    let request;
    if (data.owner_email.indexOf('@seafile_group') == -1) {
      let options = {
        'share_type': 'personal',
        'from': data.owner_email
      };
      request = seafileAPI.leaveShareRepo(data.repo_id, options);
    } else {
      request = seafileAPI.leaveShareGroupOwnedRepo(data.repo_id);
    }

    request.then((res) => {
      this.setState({
        unshared: true
      });
      // TODO: show feedback msg
    }).catch((error) => {
        // TODO: show feedback msg
    });
  }

  toggleShareDialog = () => {
    this.setState({isShowSharedDialog: false});
  }

  render() {
    if (this.state.unshared) {
      return null;
    }

    const data = this.props.data;

    data.icon_url = Utils.getLibIconUrl(data); 
    data.icon_title = Utils.getLibIconTitle(data);
    data.url = `${siteRoot}#shared-libs/lib/${data.repo_id}/`;

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let shareIconClassName = 'op-icon sf2-icon-share repo-share-btn' + iconVisibility; 
    let leaveShareIconClassName = 'op-icon sf2-icon-x3' + iconVisibility;

    const desktopItem = (
      <Fragment>
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
          <td><Link to={`${siteRoot}library/${data.repo_id}/${data.repo_name}/`}>{data.repo_name}</Link></td>
          <td>
            {(isPro && data.is_admin) &&
              <a href="#" className={shareIconClassName} title={gettext('Share')} onClick={this.share}></a>
            }
            <a href="#" className={leaveShareIconClassName} title={gettext('Leave Share')} onClick={this.leaveShare}></a>
          </td>
          <td>{data.size}</td>
          <td title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</td>
          <td title={data.owner_contact_email}>{data.owner_name}</td>
        </tr>
        {this.state.isShowSharedDialog && (
          <ModalPotal>
            <ShareDialog 
              itemType={'library'}
              itemName={data.repo_name}
              itemPath={'/'}
              repoID={data.repo_id}
              repoEncrypted={data.encrypted}
              enableDirPrivateShare={true}
              userPerm={data.permission}
              isAdmin={true}
              toggleDialog={this.toggleShareDialog}
            />
          </ModalPotal>
        )}
      </Fragment>
    );

    const mobileItem = (
      <Fragment>
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
          <td>
            <Link to={`${siteRoot}library/${data.repo_id}/${data.repo_name}/`}>{data.repo_name}</Link><br />
            <span className="item-meta-info" title={data.owner_contact_email}>{data.owner_name}</span>
            <span className="item-meta-info">{data.size}</span>
            <span className="item-meta-info" title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</span>
          </td>
          <td>
            {(isPro && data.is_admin) &&
              <a href="#" className={shareIconClassName} title={gettext('Share')} onClick={this.share}></a>
            }
            <a href="#" className={leaveShareIconClassName} title={gettext("Leave Share")} onClick={this.leaveShare}></a>
          </td>
        </tr>
        {this.state.isShowSharedDialog && (
          <ModalPotal>
            <ShareDialog 
              itemType={'library'}
              itemName={data.repo_name}
              itemPath={'/'}
              repoID={data.repo_id}
              repoEncrypted={data.encrypted}
              enableDirPrivateShare={true}
              userPerm={data.permission}
              isAdmin={true}
              toggleDialog={this.toggleShareDialog}
            />
          </ModalPotal>
        )}
      </Fragment>
    );

    return window.innerWidth >= 768 ? desktopItem : mobileItem;
  }
}

Item.propTypes = {
  data: PropTypes.object.isRequired
};

class SharedLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      sortBy: 'name', // 'name' or 'time'
      sortOrder: 'asc' // 'asc' or 'desc'
    };
  }

  componentDidMount() {
    seafileAPI.listRepos({type:'shared'}).then((res) => {
      // res: {data: {...}, status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      let repoList = res.data.repos.map((item) => {
        return new Repo(item);
      });
      this.setState({
        loading: false,
        items: Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }

      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  sortItems = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortRepos(this.state.items, sortBy, sortOrder)
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('Shared with me')}</h3>
          </div>
          <div className="cur-view-content">
            <Content
              loading={this.state.loading}
              errorMsg={this.state.errorMsg}
              items={this.state.items}
              sortBy={this.state.sortBy}
              sortOrder={this.state.sortOrder}
              sortItems={this.sortItems}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default SharedLibraries;
