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
      let libLink = <a href={libURL}>{item.repo_name}</a>;
      let smallLibLink = <a className="small" href={libURL}>{item.repo_name}</a>;

      if (item.obj_type == 'repo') {
        switch(item.op_type) {
          case 'create':
            op = gettext("Created a library");
            details = <td>{libLink}</td>;
            break;
          case 'rename':
            op = gettext("Renamed a library");
            details = <td>{item.old_repo_name} => {libLink}</td>;
            break;
          case 'delete':
            op = gettext("Deleted a library");
            details = <td>{item.repo_name}</td>;
            break;
          case 'recover':
            op = gettext("Restored a library");
            details = <td>{libLink}</td>;
            break;
          case 'clean-up-trash':
            if (item.days == 0) {
              op = gettext("Removed all items from trash.");
            } else {
              op = gettext("Removed items older than {n} days from trash.").replace('{n}', item.days);
            }
            details = <td>{libLink}</td>;
            break;
        }
      } else if (item.obj_type == 'file') {
        let fileURL = `${siteRoot}lib/${item.repo_id}/file${this.encodePath(item.path)}`;
        let fileLink = <a href={fileURL}>{item.name}</a>;
        switch(item.op_type) {
          case 'create':
            op = gettext("Created a file");
            details = <td>{fileLink}<br />{smallLibLink}</td>;
            break;
          case 'delete':
            op = gettext("Deleted a file");
            details = <td>{item.name}<br />{smallLibLink}</td>;
            break;
          case 'recover':
            op = gettext("Restored a file");
            details = <td>{fileLink}<br />{smallLibLink}</td>;
            break;
          case 'rename':
            op = gettext("Renamed a file");
            details = <td>{item.old_name} => {fileLink}<br />{smallLibLink}</td>;
            break;
          case 'move':
            let filePathLink = <a href={fileURL}>{item.path}</a>;
            op = gettext("Moved a file");
            details = <td>{item.old_path} => {filePathLink}<br />{smallLibLink}</td>;
            break;
          case 'edit': // update
            op = gettext("Updated a file");
            details = <td>{fileLink}<br />{smallLibLink}</td>;
            break;
        }
      } else { // dir
        let dirURL = `${siteRoot}#common/lib/${item.repo_id}${this.encodePath(item.path)}`;
        let dirLink = <a href={dirURL}>{item.name}</a>;
        switch(item.op_type) {
          case 'create':
            op = gettext("Created a folder");
            details = <td>{dirLink}<br />{smallLibLink}</td>;
            break;
          case 'delete':
            op = gettext("Deleted a folder");
            details = <td>{item.name}<br />{smallLibLink}</td>;
            break;
          case 'recover':
            op = gettext("Restored a folder");
            details = <td>{dirLink}<br />{smallLibLink}</td>;
            break;
          case 'rename':
            op = gettext("Renamed a folder");
            details = <td>{item.old_name} => {dirLink}<br />{smallLibLink}</td>;
            break;
          case 'move':
            let dirPathLink = <a href={dirURL}>{item.path}</a>;
            op = gettext("Moved a folder");
            details = <td>{item.old_path} => {dirPathLink}<br />{smallLibLink}</td>;
            break;
        }
      }

      return (
        <tr key={index}>
          <td className="text-center">
            <img src={item.avatar_url} alt="" width="24" className="avatar" />
          </td>
          <td>
            <a href={userProfileURL}>{item.author_name}</a>
          </td>
          <td>{op}</td>
          {details}
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
    const pageNum = 1 
    this.props.seafileAPI.getActivities(pageNum)
    .then(res => {
      // not logged in
      if (res.status == 403) {
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
            items: res.data.events,
            has_more: res.data.events.length == per_page ? true : false
          }
        });
      }
    });
  }

  getMore() {
    const pageNum = this.state.events.page + 1;
    this.props.seafileAPI.getActivities(pageNum)
    .then(res => {
      this.setState(function(prevState, props) {
        let events = prevState.events;
        if (res.status == 403) { // log out
          events.error_msg = gettext("Permission denied");
          events.has_more = false;
        }
        if (res.ok) {
          events.page += 1;
          events.items = events.items.concat(res.data.events);
          events.has_more = res.data.events.length == per_page ? true : false;
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
