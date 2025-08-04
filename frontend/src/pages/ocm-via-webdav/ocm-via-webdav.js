import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';

import '../../css/lib-content-view.css';

dayjs.extend(relativeTime);

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
    this.getAllReceivedShares();
  }

  getAllReceivedShares = () => {
    const url = seafileAPI.server + '/ocm-via-webdav/received-shares/';
    seafileAPI.req.get(url).then((res) => {
      const { received_share_list } = res.data;
      this.setState({
        loading: false,
        shareID: '',
        path: '',
        items: this.sortItems(received_share_list)
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  leaveShare = (item) => {
    const { id, name } = item;
    const url = seafileAPI.server + '/ocm-via-webdav/received-shares/' + id + '/';
    seafileAPI.req.delete(url).then((res) => {
      let items = this.state.items.filter(item => {
        return item.id != id;
      });
      this.setState({ items: items });
      toaster.success(gettext('Successfully unshared {name}').replace('{name}', name));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  openFolder = (item) => {
    this.setState({
      loading: true,
    });

    const url = seafileAPI.server + '/ocm-via-webdav/received-shares/' + item.id + '/?path=' + item.path;
    seafileAPI.req.get(url).then((res) => {
      const { received_share_list, parent_dir } = res.data;
      this.setState({
        loading: false,
        shareID: item.id,
        path: parent_dir,
        items: this.sortItems(received_share_list)
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onPathClick = (path) => {
    this.setState({
      loading: true
    });

    const url = seafileAPI.server + '/ocm-via-webdav/received-shares/' + this.state.shareID + '/?path=' + path;
    seafileAPI.req.get(url).then((res) => {
      const { received_share_list, parent_dir } = res.data;
      this.setState({
        loading: false,
        path: parent_dir,
        items: this.sortItems(received_share_list)
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  sortItems = (items) => {
    return items.sort((a, b) => {
      return a.is_dir ? -1 : 1;
    });
  };

  render() {
    const { loading, errorMsg, items, shareID, path } = this.state;

    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path align-items-center">
              <DirPath
                shareID={shareID}
                currentPath={path}
                onPathClick={this.onPathClick}
                getAllReceivedShares={this.getAllReceivedShares}
              />
            </div>
            <div className="cur-view-content">
              <Content
                loading={loading}
                errorMsg={errorMsg}
                items={items}
                path={path}
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
  };

  constructor(props) {
    super(props);
  }

  render() {
    const { loading, errorMsg, items, path } = this.props;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip
          title={gettext('No files or folders have been shared with you')}
          text={gettext('No files or folders have been shared with you from other servers.')}
        >
        </EmptyTip>
      );

      const table = (
        <table>
          <thead>
            <tr>
              <th width="5%"></th>
              <th width="40%">{gettext('Name')}</th>
              <th width="10%">{/* operations */}</th>
              <th width="30%">{gettext('Shared By')}</th>
              <th width="15%">{gettext('Sharing Time')}</th>
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

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  path: PropTypes.string.isRequired,
  leaveShare: PropTypes.func.isRequired,
  openFolder: PropTypes.func.isRequired,
};

class Item extends Component {

  static propTypes = {
    item: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOpIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({
      isHighlighted: true,
      isOpIconShown: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShown: false
    });
  };

  downloadFile = () => {
    let downloadUrl = siteRoot + 'ocm-via-webdav/download-received-file/?share_id=' + this.props.item.id + '&path=' + this.props.item.path;
    window.location.href = downloadUrl;
  };

  leaveShare = () => {
    this.props.leaveShare(this.props.item);
  };

  openFolder = (e) => {
    e.preventDefault();
    this.props.openFolder(this.props.item);
  };

  render() {
    const { item, path } = this.props;
    const { isHighlighted, isOpIconShown } = this.state;

    if (item.is_dir) {
      item.icon_url = Utils.getFolderIconUrl();
    } else {
      item.icon_url = Utils.getFileIconUrl(item.name);
    }
    return (
      <tr
        className={isHighlighted ? 'tr-highlight' : ''}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.handleMouseOut}
        onFocus={this.handleMouseOver}
      >
        <td className="text-center">
          <img src={item.icon_url} width="24" alt="" />
        </td>
        <td>
          {item.is_dir
            ? <a href="#" onClick={this.openFolder}>{item.name}</a>
            : item.name
          }
        </td>
        <td>
          {item.is_dir ? '' : <i className={`op-icon sf3-font sf3-font-download1 ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Download')} onClick={this.downloadFile}></i>}
          {path ? '' : <i className={`op-icon sf2-icon-x3 ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Leave Share')} onClick={this.leaveShare}></i>}
        </td>
        <td>{item.shared_by}</td>
        <td title={dayjs(item.ctime).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(item.ctime).fromNow()}</td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  leaveShare: PropTypes.func.isRequired,
  openFolder: PropTypes.func.isRequired,
};

class DirPath extends React.Component {

  static propTypes = {
    currentPath: PropTypes.string.isRequired,
    onPathClick: PropTypes.func.isRequired,
    getAllReceivedShares: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
    };
  }

  onPathClick = (e) => {
    let path = Utils.getEventData(e, 'path');
    this.props.onPathClick(path);
  };

  turnPathToLink = (path) => {
    path = path.slice(1, path.length - 1);
    let pathList = path.split('/');
    let nodePath = '';
    let pathElem = pathList.map((item, index) => {
      if (index === (pathList.length - 1)) {
        return (
          <Fragment key={index}>
            <span className="path-split">/</span>
            <span className="last-path-item" title={item}>{item}</span>
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
            <span
              className="path-item"
              data-path={nodePath}
              onClick={this.onPathClick}
              title={item}
            >
              {item}
            </span>
          </Fragment>
        );
      }
    });
    return pathElem;
  };

  render() {
    const { currentPath } = this.props;
    return (
      <div className="path-container dir-view-path">
        <span
          className="path-item mw-100"
          onClick={this.props.getAllReceivedShares}
          title={gettext('Shared from other servers')}
        >
          {gettext('Shared from other servers')}
        </span>
        {currentPath && this.turnPathToLink(currentPath)}
      </div>
    );
  }
}

DirPath.propTypes = {
  shareID: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  onPathClick: PropTypes.func.isRequired,
  getAllReceivedShares: PropTypes.func.isRequired,
};

export default OCMViaWebdav;
