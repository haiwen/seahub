import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot } from '../../utils/constants';

const contentPropTypes = {
  data: PropTypes.object.isRequired,
};

class FileActivitiesContent extends Component {

  render() {
    let {loading, error_msg, items, has_more} = this.props.data;
    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (error_msg) {
      return <p className="error text-center">{error_msg}</p>;
    } else {
      return ( 
        <div className="activity-table-container">
          <table className="table table-hover table-vcenter">
            <thead>
              <tr>
                <th width="8%">{/* avatar */}</th>
                <th width="10%">{gettext('User')}</th>
                <th width="25%">{gettext('Operation')}</th>
                <th width="37%">{gettext('File')} / {gettext('Library')}</th>
                <th width="20%">{gettext('Time')}</th>
              </tr>
            </thead>
            <TableBody items={items} />
          </table>
          {has_more ? <span className="loading-icon loading-tip"></span> : ''}
          {error_msg ? <p className="error text-center">{error_msg}</p> : ''}
        </div>
      ); 
    }
  }
}

FileActivitiesContent.propTypes = contentPropTypes;


const tablePropTypes = {
  items: PropTypes.array.isRequired,
};

class TableBody extends Component {

  encodePath(path) {
    let path_arr = path.split('/');
    let path_arr_ = [];
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
      let smallLibLink = <a className="small text-secondary" href={libURL}>{item.repo_name}</a>;

      if (item.obj_type == 'repo') {
        switch(item.op_type) {
        case 'create':
          op = gettext('Created library');
          details = <td>{libLink}</td>;
          break;
        case 'rename':
          op = gettext('Renamed library');
          details = <td>{item.old_repo_name} => {libLink}</td>;
          break;
        case 'delete':
          op = gettext('Deleted library');
          details = <td>{item.repo_name}</td>;
          break;
        case 'recover':
          op = gettext('Restored library');
          details = <td>{libLink}</td>;
          break;
        case 'clean-up-trash':
          if (item.days == 0) {
            op = gettext('Removed all items from trash.');
          } else {
            op = gettext('Removed items older than {n} days from trash.').replace('{n}', item.days);
          }
          details = <td>{libLink}</td>;
          break;
        }
      } else if (item.obj_type == 'file') {
        let fileURL = `${siteRoot}lib/${item.repo_id}/file${this.encodePath(item.path)}`;
        let fileLink = <a href={fileURL}>{item.name}</a>;
        switch(item.op_type) {
        case 'create':
          op = gettext('Created file');
          details = <td>{fileLink}<br />{smallLibLink}</td>;
          break;
        case 'delete':
          op = gettext('Deleted file');
          details = <td>{item.name}<br />{smallLibLink}</td>;
          break;
        case 'recover':
          op = gettext('Restored file');
          details = <td>{fileLink}<br />{smallLibLink}</td>;
          break;
        case 'rename':
          op = gettext('Renamed file');
          details = <td>{item.old_name} => {fileLink}<br />{smallLibLink}</td>;
          break;
        case 'move':
          var filePathLink = <a href={fileURL}>{item.path}</a>;
          op = gettext('Moved file');
          details = <td>{item.old_path} => {filePathLink}<br />{smallLibLink}</td>;
          break;
        case 'edit': // update
          op = gettext('Updated file');
          details = <td>{fileLink}<br />{smallLibLink}</td>;
          break;
        }
      } else { // dir
        let dirURL = `${siteRoot}#common/lib/${item.repo_id}${this.encodePath(item.path)}`;
        let dirLink = <a href={dirURL}>{item.name}</a>;
        switch(item.op_type) {
        case 'create':
          op = gettext('Created folder');
          details = <td>{dirLink}<br />{smallLibLink}</td>;
          break;
        case 'delete':
          op = gettext('Deleted folder');
          details = <td>{item.name}<br />{smallLibLink}</td>;
          break;
        case 'recover':
          op = gettext('Restored folder');
          details = <td>{dirLink}<br />{smallLibLink}</td>;
          break;
        case 'rename':
          op = gettext('Renamed folder');
          details = <td>{item.old_name} => {dirLink}<br />{smallLibLink}</td>;
          break;
        case 'move':
          var dirPathLink = <a href={dirURL}>{item.path}</a>;
          op = gettext('Moved folder');
          details = <td>{item.old_path} => {dirPathLink}<br />{smallLibLink}</td>;
          break;
        }
      }

      return (
        <tr key={index}>
          <td className="text-center">
            <img src={item.avatar_url} alt="" width="36px" height="36px" className="avatar" />
          </td>
          <td>
            <a href={userProfileURL}>{item.author_name}</a>
          </td>
          <td><span className="activity-op">{op}</span></td>
          {details}
          <td className="text-secondary" dangerouslySetInnerHTML={{__html:item.time_relative}}></td>
        </tr>
      );
    }, this);

    return (
      <tbody>{listFilesActivities}</tbody>
    );
  }
}

TableBody.propTypes = tablePropTypes;

class FilesActivities extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error_msg: '',
      events: {},
      items: [],
      page: 1,
      has_more: false
    };

    this.handleScroll = this.handleScroll.bind(this);
  }

  componentDidMount() {
    const pageNum = 1;
    const avatarSize = 72;
    seafileAPI.listActivities(pageNum, avatarSize).then(res => {
      // not logged in
      if (res.status == 403) {
        this.setState({
          loading: false,
          error_msg: gettext('Permission denied')
        });
      } else {
        // {"events":[...]}
        this.setState({
          loading: false,
          items: res.data.events,
          has_more: res.data.events.length == '0' ? false : true
        });
      }
    });
  }

  getMore() {
    const pageNum = this.state.page + 1;
    this.setState({
      page: pageNum
    });
    seafileAPI.listActivities(pageNum)
      .then(res => {
        if (res.status == 403) {
          this.setState({
            loading: false,
            error_msg: gettext('Permission denied')
          });
        } else {
          // {"events":[...]}
          this.setState({
            loading: false,
            items: [...this.state.items, ...res.data.events],
            has_more: res.data.events.length == '0' ? false : true 
          });
        }
      });
  }

  handleScroll(event) {
    const clientHeight = event.target.clientHeight;
    const scrollHeight = event.target.scrollHeight;
    const scrollTop    = event.target.scrollTop;
    const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
    if (this.state.has_more && isBottom) { // scroll to the bottom
      this.getMore();
    }
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="activities">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('Activities')}</h3>
          </div>
          <div className="cur-view-content" onScroll={this.handleScroll}>
            <FileActivitiesContent data={this.state} />
          </div>
        </div>
      </div>
    );
  }
}

export default FilesActivities;
