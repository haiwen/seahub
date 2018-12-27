import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';

const contentPropTypes = {
  isLoadingMore: PropTypes.bool.isRequired,
  items: PropTypes.array.isRequired,
};

class FileActivitiesContent extends Component {

  render() {
    let {items, isLoadingMore} = this.props;
    return ( 
      <Fragment>
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
        {isLoadingMore ? <span className="loading-icon loading-tip"></span> : ''}
      </Fragment>
    ); 
  }
}

FileActivitiesContent.propTypes = contentPropTypes;


const tablePropTypes = {
  items: PropTypes.array.isRequired,
};

class TableBody extends Component {

  render() {
    let listFilesActivities = this.props.items.map(function(item, index) {
      let op, details;
      let userProfileURL = `${siteRoot}profile/${encodeURIComponent(item.author_email)}/`;

      let libURL = siteRoot + 'library/' + item.repo_id + '/' + encodeURIComponent(item.repo_name) + '/';
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
        let fileURL = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
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
        let dirURL = siteRoot + 'library/' + item.repo_id + '/' + encodeURIComponent(item.repo_name) + Utils.encodePath(item.path);
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
      errorMsg: '',
      isFirstLoading: true,
      isLoadingMore: false,
      currentPage: 1,
      hasMore: false,
      items: [],
    };
  }

  componentDidMount() {
    const avatarSize = 72;
    let currentPage = this.state.currentPage;
    seafileAPI.listActivities(currentPage, avatarSize).then(res => {
      // {"events":[...]}
      this.setState({
        items: res.data.events,
        currentPage: currentPage + 1,
        isFirstLoading: false,
        hasMore: true,
      });
    }).catch(error => {
      if (error.response.status == 403) {
        this.setState({
          isFirstLoading: false,
          errorMsg: gettext('Permission denied')
        });
      }
    });
  }

  getMore() {
    this.setState({isLoadingMore: true});
    let currentPage = this.state.currentPage;
    seafileAPI.listActivities(currentPage).then(res => {
      // {"events":[...]}
      this.setState({
        isLoadingMore: false,
        items: [...this.state.items, ...res.data.events],
        currentPage: currentPage + 1,
        hasMore: res.data.events.length === 0 ? false : true 
      });
    }).catch(error => {
      if (error.response.status == 403) {
        this.setState({
          isLoadingMore: false,
          errorMsg: gettext('Permission denied')
        });
      }
    });
  }

  handleScroll = (event) => {
    const clientHeight = event.target.clientHeight;
    const scrollHeight = event.target.scrollHeight;
    const scrollTop    = event.target.scrollTop;
    const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
    if (this.state.hasMore && isBottom) { // scroll to the bottom
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
            {this.state.isFirstLoading && <Loading />}
            {(!this.state.isFirstLoading && this.state.errorMsg) && 
              <p className="error text-center">{this.state.errorMsg}</p>
            }
            {!this.state.isFirstLoading && 
              <FileActivitiesContent items={this.state.items} isLoadingMore={this.state.isLoadingMore}/>
            }
          </div>
        </div>
      </div>
    );
  }
}

export default FilesActivities;
