import React, { Component } from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl, username } from '../../utils/constants';
import Loading from '../../components/loading';
import GroupRepoItem from './group-repo-item';

import '../../css/groups.css';

class Header extends Component {

  render() {
    const {loading, errorMsg, data} = this.props.data;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      /*
      admins: ["lj@1.com"]
      avatar_url: "http://127.0.0.1:8000/media/avatars/groups/default.png"
      created_at: "2018-10-25T08:18:11+00:00"
      id: 2
      name: "g1"
      owner: "lj@1.com"
      parent_group_id: 0
      wiki_enabled: false
      */
      const path = (
        <div className="group-path cur-view-path-path">
          <a href={`${siteRoot}groups/`}>{gettext("Groups")}</a>
          <span className="path-split">/</span>
          <span className="group-name">{data.name}</span>
          {data.parent_group_id == 0 ? null :
            <span className="address-book-group-icon icon-building" title={gettext("This is a special group representing a department.")}></span>
          }
        </div>
      );

      let showSettingsIcon = true;
      if (data.parent_group_id != 0 && data.admins.indexOf(username) == -1) {
        showSettingsIcon = false;
      }

      // TODO: click icon
      const toolbar = (
        <div className="group-toolbar-2">
          {showSettingsIcon ? <a href="#" className="sf2-icon-cog1 op-icon group-top-op-icon" title={gettext("Settings")} id="group-settings-icon" aria-label={gettext("Settings")}></a> : null}
          <a href="#" className="sf2-icon-user2 op-icon group-top-op-icon" title={gettext("Members")} id="group-members-icon" aria-label={gettext("Members")}></a>
        </div>
      );

      return (
        <React.Fragment>
          {path}
          {toolbar}
        </React.Fragment>
      );
    }
  }
}

class Content extends Component {

  render() {
    const {loading, errorMsg, items} = this.props.data.repos;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      if (!items) {
        return null;
      }

      const groupInfo = this.props.data.groupMetaInfo.data;

      let emptyTip;
      if (groupInfo.parent_group_id == 0) {
        emptyTip = (
          <div className="empty-tip">
            <h2>{gettext('No library is shared to this group')}</h2>
            <p>{gettext('You can share libraries by clicking the "New Library" button above or the "Share" icon on your libraries list.')}</p>
            <p>{gettext('Libraries shared as writable can be downloaded and synced by other group members. Read only libraries can only be downloaded, updates by others will not be uploaded.')}</p>
          </div>
        );
      } else {
        if (groupInfo.admins.indexOf(username) == -1) {
          emptyTip = (
            <div className="empty-tip">
              <h2>{gettext('No libraries')}</h2>
            </div>
          );
        } else {
          emptyTip = (
            <div className="empty-tip">
              <h2>{gettext('No libraries')}</h2>
              <p>{gettext('You can create libraries by clicking the "New Library" button above.')}</p>
            </div>
          );
        }
      }

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
            <th width="68%">
              {gettext("Sort:")} {/* TODO: sort */}
              {gettext("name")}<a className="table-sort-op mobile-table-sort-op by-name" href="#"> <span className="sort-icon icon-caret-down hide"></span></a>
              {gettext("last update")}<a className="table-sort-op mobile-table-sort-op by-time" href="#"> <span className="sort-icon icon-caret-up"></span></a>
            </th>
            <th width="14%"><span className="sr-only">{gettext("Actions")}</span></th>
          </tr>
        </thead>
      );

      const extraData = {
        groupId: groupInfo.id,
        isStaff: groupInfo.admins.indexOf(username) != -1,
        showRepoOwner: true
      };

      const table = (
        <table className="table table-hover table-vcenter">
          {window.innerWidth >= 768 ? desktopThead : mobileThead}
          <TableBody items={items} extra={extraData} />
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
      return <GroupRepoItem key={index} data={item} extra={this.props.extra} />;
    }, this);

    return (
      <tbody>{listItems}</tbody>
    );
  }
}

class Group extends Component {
  constructor(props) {
    super(props);
    this.state = {
      groupMetaInfo: {
        loading: true,
        errorMsg: ''
      },
      repos: {
        loading: false,
        errorMsg: ''
      }
    };
  }

  componentDidMount() {
    seafileAPI.getGroup(this.props.groupID).then((res) => {
      // res: {data: {...}, status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      this.setState({
        groupMetaInfo: {
          loading: false,
          data: res.data
        }
      });
      this.listGroupRepos();
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            groupMetaInfo: {
              loading: false,
              errorMsg: gettext("Permission denied")
            }
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            groupMetaInfo: {
              loading: false,
              errorMsg: gettext("Error")
            }
          });
        }
      } else {
        this.setState({
          groupMetaInfo: {
            loading: false,
            errorMsg: gettext("Please check the network.")
          }
        });
      }
    });
  }

  listGroupRepos() {
    seafileAPI.listGroupRepos(this.props.groupID).then((res) => {
      // res: {data: [...], status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      this.setState({
        repos: {
          loading: false,
          items: res.data
        }
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            repos: {
              loading: false,
              errorMsg: gettext("Permission denied")
            }
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            repos: {
              loading: false,
              errorMsg: gettext("Error")
            }
          });
        }
      } else {
        this.setState({
          repos: {
            loading: false,
            errorMsg: gettext("Please check the network.")
          }
        });
      }
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path">
            <Header data={this.state.groupMetaInfo} />
          </div>
          <div className="cur-view-content">
            <Content data={this.state} />
          </div>
        </div>
      </div>
    );
  }
}

export default Group;
