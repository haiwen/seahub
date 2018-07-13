import React, { Component } from 'react';

const gettext = window.gettext;
const siteRoot = window.app.config.siteRoot;
const per_page = 25; // default

class FilesActivitiesContent extends Component {

  render() {
    const {loading, error_msg, events} = this.props.data;
    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (error_msg) {
      return <p className="error text-center">{error_msg}</p>;
    } else {
      return ( 
        <React.Fragment>
          <table className="table table-hover table-vcenter">
            <thead>
              <tr>
                <th width="8%">{/* avatar */}</th>
                <th width="15%">{gettext("User")}</th>
                <th width="35%">{gettext("Operation")}</th>
                <th width="27%">{gettext("File")} / {gettext("Library")}</th>
                <th width="15%">{gettext("Time")}</th>
              </tr>
            </thead>
            <TableBody items={events.items} />
          </table>
          {events.has_more ? <span className="loading-icon loading-tip"></span> : ''}
          {events.error_msg ? <p className="error text-center">{events.error_msg}</p> : ''}
        </React.Fragment>
      ); 
    }
  }
}

class TableBody extends Component {

  HTMLescape(html) {
    return document.createElement('div')
      .appendChild(document.createTextNode(html))
      .parentNode
      .innerHTML;
  }

  encodePath(path) {
    let path_arr = path.split('/'),
    path_arr_ = []; 
    for (let i = 0, len = path_arr.length; i < len; i++) {
      path_arr_.push(encodeURIComponent(path_arr[i]));
    }     
    return path_arr_.join('/');
  }

  render() {
    let listFilesActivities = this.props.items.map(function(item, index) {
      let op, details;
      let userProfileURL = `${siteRoot}profile/${encodeURIComponent(item.author_email)}/`;

      let libURL = `${siteRoot}#common/lib/${item.repo_id}`;
      let libLink = `<a href=${libURL}>${this.HTMLescape(item.repo_name)}</a>`;
      let smallLibLink = `<a class="small" href=${libURL}>${this.HTMLescape(item.repo_name)}</a>`;

      if (item.obj_type == 'repo') {
        switch(item.op_type) {
          case 'create':
            op = gettext("Created a library");
            details = libLink;
            break;
          case 'rename':
            op = gettext("Renamed a library");
            details = `${this.HTMLescape(item.old_repo_name)} => ${libLink}`;
            break;
          case 'delete':
            op = gettext("Deleted a library");
            details = `${this.HTMLescape(item.repo_name)}`;
            break;
          case 'recover':
            op = gettext("Restored a library");
            details = libLink;
            break;
          case 'clean-up-trash':
            if (item.days == 0) {
              op = gettext("Removed all items from trash.");
            } else {
              op = gettext("Removed items older than {n} days from trash.").replace('{n}', item.days);
            }
            details = libLink;
            break;
        }
      } else if (item.obj_type == 'file') {
        let fileURL = `${siteRoot}lib/${item.repo_id}/file${this.encodePath(item.path)}`;
        let fileLink = `<a href=${fileURL}>${this.HTMLescape(item.name)}</a>`;
        switch(item.op_type) {
          case 'create':
            op = gettext("Created a file");
            details = `${fileLink}<br />${smallLibLink}`;
            break;
          case 'delete':
            op = gettext("Deleted a file");
            details = `${this.HTMLescape(item.name)}<br />${smallLibLink}`;
            break;
          case 'recover':
            op = gettext("Restored a file");
            details = `${fileLink}<br />${smallLibLink}`;
            break;
          case 'rename':
            op = gettext("Renamed a file");
            details = `${this.HTMLescape(item.old_name)} => ${fileLink}<br />${smallLibLink}`;
            break;
          case 'move':
            let filePathLink = `<a href=${fileURL}>${this.HTMLescape(item.path)}</a>`;
            op = gettext("Moved a file");
            details = `${this.HTMLescape(item.old_path)} => ${filePathLink}<br />${smallLibLink}`;
            break;
          case 'edit': // update
            op = gettext("Updated a file");
            details = `${fileLink}<br />${smallLibLink}`;
            break;
        }
      } else { // dir
        let dirURL = `${siteRoot}#common/lib/${item.repo_id}${this.encodePath(item.path)}`;
        let dirLink = `<a href=${dirURL}>${this.HTMLescape(item.name)}</a>`;
        switch(item.op_type) {
          case 'create':
            op = gettext("Created a folder");
            details = `${dirLink}<br />${smallLibLink}`;
            break;
          case 'delete':
            op = gettext("Deleted a folder");
            details = `${this.HTMLescape(item.name)}<br />${smallLibLink}`;
            break;
          case 'recover':
            op = gettext("Restored a folder");
            details = `${dirLink}<br />${smallLibLink}`;
            break;
          case 'rename':
            op = gettext("Renamed a folder");
            details = `${this.HTMLescape(item.old_name)} => ${dirLink}<br />${smallLibLink}`;
            break;
          case 'move':
            let dirPathLink = `<a href=${dirURL}>${this.HTMLescape(item.path)}</a>`;
            op = gettext("Moved a folder");
            details = `${this.HTMLescape(item.old_path)} => ${dirPathLink}<br />${smallLibLink}`;
            break;
        }
      }

      return (
        <tr key={index}>
          <td className="text-center">
            <img src={item.avatar_url} alt="" width="24" className="avatar" />
          </td>
          <td>
            <a href={userProfileURL}>{this.HTMLescape(item.author_name)}</a>
          </td>
          <td>{op}</td>
          <td dangerouslySetInnerHTML={{__html:details}}></td>
          <td dangerouslySetInnerHTML={{__html:item.time_relative}}></td>
        </tr>
      );
    }, this);

    return (
      <tbody>{listFilesActivities}</tbody>
    );
  }
}

class FilesActivities extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error_msg: '',
      events: {}
    };

    this.handleScroll = this.handleScroll.bind(this);
  }

  componentDidMount() {
    const url = `${siteRoot}api/v2.1/activities/?page=1`;
    fetch(url, {credentials: 'same-origin'})
    .then((res) => {
      this.setState({
        res: res
      });
      return res;
    })
    .then(res => res.json())
    .then((result) => {
      // not logged in
      if (this.state.res.status == 403) {
        this.setState({
          loading: false,
          error_msg: gettext("Permission denied")
        });
      } else {
        // {"events":[...]}
        this.setState({
          loading: false,
          events: {
            page: 1,
            items: result.events,
            has_more: result.events.length == per_page ? true : false
          }
        });
      }
    });
  }

  getMore() {
    const page = this.state.events.page + 1;
    const url = `${siteRoot}api/v2.1/activities/?page=${page}`;
    fetch(url, {credentials: 'same-origin'})
    .then((res) => {
      this.setState({
        res: res
      });
      return res;
    })
    .then(res => res.json())
    .then((result) => {
      this.setState(function(prevState, props) {
        let events = prevState.events;
        if (this.state.res.status == 403) { // log out
          events.error_msg = gettext("Permission denied");
          events.has_more = false;
        }
        if (this.state.res.ok) {
          events.page += 1;
          events.items = events.items.concat(result.events);
          events.has_more = result.events.length == per_page ? true : false;
        }
        return {events: events};
      });
    });
  }

  handleScroll(e) {
    let $el = e.target;
    if (this.state.events.has_more &&
      $el.scrollTop > 0 &&
      $el.clientHeight + $el.scrollTop == $el.scrollHeight) { // scroll to the bottom
      this.getMore();
    }
  }

  render() {
    return (
      <div className="main-panel-main" id="activities">
        <div className="cur-view-path">
          <h3>{gettext("Activities")}</h3>
        </div>
        <div className="cur-view-main-con" onScroll={this.handleScroll}>
          <FilesActivitiesContent data={this.state} />
        </div>
      </div>
    );
  }
}

export default FilesActivities;
