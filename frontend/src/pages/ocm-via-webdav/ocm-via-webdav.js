import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@gatsbyjs/reach-router';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';

class OCMViaWebdav extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      shareID: '',
      path: '',
      items: [],
      errorMsg: '',
    };
  }

  componentDidMount() {
    this.getAllReceivedShares()
  }

  getAllReceivedShares = () => {
    const url = seafileAPI.server + '/ocm-via-webdav/received-shares/';
    seafileAPI.req.get(url).then((res) => {
      this.setState({
        loading: false,
        shareID: '',
        path: '',
        items: res.data.received_share_list,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  leaveShare = (item) => {
    const { id, name } = item;
    const url = seafileAPI.server + '/ocm-via-webdav/received-shares/' + id + '/';
    seafileAPI.req.delete(url).then((res) => {
      let items = this.state.items.filter(item => {
        return item.id != id;
      });
      this.setState({items: items});
      toaster.success(gettext('Successfully unshared {name}').replace('{name}', name));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  openFolder = (item) => {

    this.setState({
      loading: true,
    });

    const url = seafileAPI.server + '/ocm-via-webdav/received-shares/' + item.id + '/?path=' + item.path;
    seafileAPI.req.get(url).then((res) => {
      this.setState({
        loading: false,
        shareID: item.id,
        path: res.data.parent_dir,
        items: res.data.received_share_list,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onPathClick = (path) => {

    this.setState({
      loading: true,
    });

    const url = seafileAPI.server + '/ocm-via-webdav/received-shares/' + this.state.shareID + '/?path=' + path;
    seafileAPI.req.get(url).then((res) => {
      this.setState({
        loading: false,
        items: res.data.received_share_list,
        path: res.data.parent_dir,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path align-items-center">
              <DirPath
                shareID={this.state.shareID}
                currentPath={this.state.path}
                onPathClick={this.onPathClick}
                getAllReceivedShares={this.getAllReceivedShares}
              />
            </div>
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
                path={this.state.path}
                leaveShare={this.leaveShare}
                openFolder={this.openFolder}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}


class Content extends Component {

  static propTypes = {
    loading: PropTypes.bool.isRequired,
    errorMsg: PropTypes.string.isRequired,
    items: PropTypes.array.isRequired,
    path: PropTypes.string.isRequired,
  }

  constructor(props) {
    super(props);
  }

  render() {
    const { loading, errorMsg, items, path } = this.props;
    const emptyTip = (
      <EmptyTip>
        <h2>{gettext('No libraries have been shared with you')}</h2>
        <p>{gettext('No libraries have been shared with you from other servers.')}</p>
      </EmptyTip>
    );

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const table = (
        <table>
          <thead>
            <tr>
              <th width="5%"></th>
              <th width="30%">{gettext('Name')}</th>
              <th width="35%">{gettext('Shared By')}</th>
              <th width="20%">{gettext('Time')}</th>
              <th width="5%">{/* operations */}</th>
              <th width="5%">{/* operations */}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return <Item
                key={index}
                item={item}
                path={path}
                leaveShare={this.props.leaveShare}
                openFolder={this.props.openFolder}
              />;
            })}
          </tbody>
        </table>
      );

      return items.length ? table : emptyTip;
    }
  }
}

class Item extends Component {

  static propTypes = {
    item: PropTypes.object.isRequired
  }

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({
      isOpIconShown: true
    });
  }

  handleMouseOut = () => {
    this.setState({
      isOpIconShown: false
    });
  }

  downloadFile = () => {
    let downloadUrl = siteRoot + 'ocm-via-webdav/download-received-file/?share_id=' + this.props.item.id + '&path=' + this.props.item.path;
    window.location.href = downloadUrl;
  }

  leaveShare = (e) => {
    e.preventDefault();
    this.props.leaveShare(this.props.item);
  }

  openFolder = (e) => {
    e.preventDefault();
    this.props.openFolder(this.props.item);
  }

  render() {
    const item = this.props.item;
    const { isOpIconShown } = this.state;

    if (item.is_dir) {
      item.icon_url = Utils.getFolderIconUrl();
    } else {
      item.icon_url = Utils.getFileIconUrl(item.name);
    }
    return (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={item.icon_url} width="24" /></td>
        <td>
          {item.is_dir ? <a href="#" onClick={this.openFolder}>{item.name}</a> : item.name}
	</td>
        <td>{item.shared_by}</td>
        <td title={moment(item.last_modified).format('llll')}>{moment(item.ctime).fromNow()}</td>
        <td>
	  {item.is_dir ? "" : <a href="#" className={`action-icon sf2-icon-download ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Download')} onClick={this.downloadFile}></a>}
        </td>
        <td>
	  {this.props.path ? "" : <a href="#" className={`action-icon sf2-icon-x3 ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Leave Share')} onClick={this.leaveShare}></a>}
        </td>
      </tr>
    );
  }
}

class DirPath extends React.Component {

  static propTypes = {
    currentPath: PropTypes.string.isRequired,
    onPathClick: PropTypes.func.isRequired,
    getAllReceivedShares: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
    };
  }

  onPathClick = (e) => {
    let path = Utils.getEventData(e, 'path');
    this.props.onPathClick(path);
  }

  turnPathToLink = (path) => {
    path = path.slice(1, path.length - 1);
    let pathList = path.split('/');
    let nodePath = '';
    let pathElem = pathList.map((item, index) => {
      if (index === (pathList.length - 1)) {
        return (
          <Fragment key={index}>
            <span className="path-split">/</span>
            <span className="path-file-name">{item}</span>
          </Fragment>
        );
      } else {
	if (index === 0) {
          nodePath = '/';
	} else {
          nodePath += item + '/';
	}
        return (
          <Fragment key={index} >
            <span className="path-split">/</span>
            <a className="path-link" data-path={nodePath} onClick={this.onPathClick}>{item}</a>
          </Fragment>
        );
      }
    });
    return pathElem;
  }

  render() {
    let pathElem = this.turnPathToLink(this.props.currentPath);
    return (
      <div className="path-container">
        <a href="#" onClick={this.props.getAllReceivedShares}>{gettext('All')}</a>
        {pathElem}
      </div>
    );
  }
}

export default OCMViaWebdav;
