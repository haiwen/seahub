import React, { Component } from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, loginUrl, username } from '../../utils/constants';
import Loading from '../../components/loading';
import GroupRepoItem from './group-repo-item';

import '../../css/groups.css';

class Content extends Component {

  render() {
    const {loading, errorMsg, items} = this.props.data;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      /* TODO:
        {% if user.permissions.can_add_group %}
        <p>{% blocktrans %}Groups allow multiple people to collaborate on libraries. You can create a group by clicking the "New Group" button.{% endblocktrans %}</p>
        {% else %}
        <p>{% trans "Groups allow multiple people to collaborate on libraries. Groups you join will be listed here." %}</p>
        {% endif %}
      */
      const emptyTip = (
        <div className="empty-tip">
          <h2>{gettext('You are not in any groups')}</h2>
          <p>{gettext('Groups allow multiple people to collaborate on libraries.')}</p>
        </div>
      );

      let listItems = items.map(function(item, index) {
        return <GroupItem key={index} data={item} />;
      }, this);

      const groupItems = (
        <React.Fragment>
          {listItems}
        </React.Fragment>
      );

      return items.length ? groupItems : emptyTip; 
    }
  }
}

class GroupItem extends Component {

  render() {

    const data = this.props.data;

    const desktopThead = (
      <thead className="invisible">
        <tr>
          <th width="8%"><span className="sr-only">{gettext("Library Type")}</span></th>
          <th width="40%">{gettext("Name")}</th>
          <th width="10%"><span className="sr-only">{gettext("Actions")}</span></th>
          <th width="20%">{gettext("Size")}</th>
          <th width="22%">{gettext("Last Update")}</th>
        </tr>
      </thead>
    );

    const mobileThead = (
      <thead className="invisible">
        <tr>
          <th width="18%"><span className="sr-only">{gettext("Library Type")}</span></th>
          <th width="68%">{gettext("name")}</th>
          <th width="14%"><span className="sr-only">{gettext("Actions")}</span></th>
        </tr>
      </thead>
    );

    const extraData = {
      groupId: data.id,
      isStaff: data.admins.indexOf(username) != -1,
      showRepoOwner: false
    };

    const table = (
      <table className="table table-hover table-vcenter group-item-table">
        {window.innerWidth >= 768 ? desktopThead : mobileThead}
        <TableBody items={data.repos} extra={extraData} />
      </table>
    );

    const emptyTip = <p className="group-item-empty-tip">{gettext('No libraries')}</p>;

    const item = (
      <React.Fragment>
        <h4 className="group-item-heading ellipsis"><a href={`${siteRoot}group/${data.id}/`} title={data.name}>{data.name}</a></h4>
        {data.repos.length ? table : emptyTip}
      </React.Fragment>
    );

    return item;
  }
}

class TableBody extends Component {

  render() {

    let listItems = this.props.items.map(function(item, index) {
      return <GroupRepoItem key={index} data={item} extra={this.props.extra} />;
    }, this);

    return (
      <tbody>{listItems}</tbody>
    );
  }
}

class Groups extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listGroupsV2({'with_repos': 1}).then((res) => { // TODO: api name
      // `{'with_repos': 1}`: list repos of every group
      // res: {data: [...], status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      this.setState({
        loading: false,
        items: res.data
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
            <h3 className="sf-heading">{gettext("My Groups")}</h3>
          </div>
          <div className="cur-view-content">
            <Content data={this.state} />
          </div>
        </div>
      </div>
    );
  }
}

export default Groups;
