import React, { Component } from 'react';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl, isPro } from '../../utils/constants';
import Loading from '../../components/loading';

class Content extends Component {

  render() {
    const {loading, errorMsg, items} = this.props.data;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <div className="empty-tip">
          <h2>{gettext('No libraries have been shared with you')}</h2>
          <p>{gettext('No libraries have been shared directly with you. You can find more shared libraries at "Shared with groups".')}</p>
        </div>
      );

      const desktopThead = (
        <thead>
          <tr>
            <th width="8%"><span className="sr-only">{gettext("Library Type")}</span></th>
            <th width="34%">{gettext("Name")}<a className="table-sort-op by-name" href="#">{/*TODO: sort*/}<span className="sort-icon icon-caret-down hide"></span></a></th>
            <th width="10%"><span className="sr-only">{gettext("Actions")}</span></th>
            <th width="14%">{gettext("Size")}</th>
            <th width="18%">{gettext("Last Update")}<a className="table-sort-op by-time" href="#">{/*TODO: sort*/}<span className="sort-icon icon-caret-up"></span></a></th>
            <th width="16%">{gettext("Owner")}</th>
          </tr>
        </thead>
      );

      const mobileThead = (
        <thead>
          <tr>
            <th width="18%"><span className="sr-only">{gettext("Library Type")}</span></th>
            <th width="76%">
              {gettext("Sort:")} {/* TODO: sort */}
              {gettext("name")}<a className="table-sort-op mobile-table-sort-op by-name" href="#"> <span className="sort-icon icon-caret-down hide"></span></a>
              {gettext("last update")}<a className="table-sort-op mobile-table-sort-op by-time" href="#"> <span className="sort-icon icon-caret-up"></span></a>
            </th>
            <th width="6%"><span className="sr-only">{gettext("Actions")}</span></th>
          </tr>
        </thead>
      );

      const table = (
        <table className="table table-hover table-vcenter">
          {window.innerWidth >= 768 ? desktopThead : mobileThead}
          <TableBody items={items} />
        </table>
      );

      return items.length ? table : emptyTip; 
    }
  }
}

class TableBody extends Component {

  constructor(props) {
    super(props);
    this.state = {
      items: this.props.items
    };
  }

  render() {

    let listItems = this.state.items.map(function(item, index) {
      return <Item key={index} data={item} />;
    }, this);

    return (
      <tbody>{listItems}</tbody>
    );
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      unshared: false
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
    // TODO
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

  render() {

    if (this.state.unshared) {
      return null;
    }

    const data = this.props.data;
    const permission = data.permission;

    let is_readonly = false;
    if (permission == 'r' || permission == 'preview') {
      is_readonly = true;
    }
    data.icon_url = Utils.getLibIconUrl({
      is_encrypted: data.encrypted,
      is_readonly: is_readonly, 
      size: Utils.isHiDPI() ? 48 : 24
    }); 
    data.icon_title = Utils.getLibIconTitle({
      'encrypted': data.encrypted,
      'is_admin': data.is_admin,
      'permission': permission
    });
    data.url = `${siteRoot}#shared-libs/lib/${data.repo_id}/`;

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let shareIconClassName = 'sf2-icon-share sf2-x repo-share-btn op-icon' + iconVisibility; 
    let leaveShareIconClassName = 'sf2-icon-delete sf2-x op-icon' + iconVisibility;

    const desktopItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
        <td><a href={data.url}>{data.repo_name}</a></td>
        <td>
          { isPro && data.is_admin ?
            <a href="#" className={shareIconClassName} title={gettext("Share")} onClick={this.share}></a>
            : ''}
          <a href="#" className={leaveShareIconClassName} title={gettext("Leave Share")} onClick={this.leaveShare}></a>
        </td>
        <td>{Utils.formatSize({bytes: data.size})}</td>
        <td title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</td>
        <td title={data.owner_contact_email}>{data.owner_name}</td>
      </tr>
    );

    const mobileItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
        <td>
          <a href={data.url}>{data.repo_name}</a><br />
          <span className="item-meta-info" title={data.owner_contact_email}>{data.owner_name}</span>
          <span className="item-meta-info">{Utils.formatSize({bytes: data.size})}</span>
          <span className="item-meta-info" title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</span>
        </td>
        <td>
          { isPro && data.is_admin ?
            <a href="#" className={shareIconClassName} title={gettext("Share")} onClick={this.share}></a>
            : ''}
          <a href="#" className={leaveShareIconClassName} title={gettext("Leave Share")} onClick={this.leaveShare}></a>
        </td>
      </tr>
    );

    return window.innerWidth >= 768 ? desktopItem : mobileItem;
  }
}

class SharedLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listRepos({type:'shared'}).then((res) => {
      // res: {data: {...}, status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      this.setState({
        loading: false,
        items: res.data.repos
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext("Permission denied")
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext("Error")
          });
        }

      } else {
        this.setState({
          loading: false,
          errorMsg: gettext("Please check the network.")
        });
      }
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext("Shared with me")}</h3>
          </div>
          <div className="cur-view-content">
            <Content data={this.state} />
          </div>
        </div>
      </div>
    );
  }
}

export default SharedLibraries;
