import React from 'react';
import ReactDOM from 'react-dom';
import { Button } from 'reactstrap';
import moment from 'moment';
import Account from './components/common/account';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import { Utils } from './utils/utils';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
import toaster from './components/toast';
import ModalPortal from './components/modal-portal';
import ShareLinkZipDownloadDialog from './components/dialog/share-link-zip-download-dialog';

import './css/shared-dir-view.css';

let loginUser = window.app.pageOptions.name;
const { token, trafficOverLimit, dirName, sharedBy, path, canDownload } = window.shared.pageOptions;

const showDownloadIcon = !trafficOverLimit && canDownload;

class SharedDirView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      items: [],
      isZipDialogOpen: false,
      zipFolderPath: ''
    };
  }

  componentDidMount() {
    if (trafficOverLimit) {
      toaster.danger(gettext('File download is disabled: the share link traffic of owner is used up.'), {
        duration: 3
      });
    }

    seafileAPI.listSharedDir(token, path).then((res) => {
      const items = res.data['dirent_list'];
      this.setState({
        isLoading: false,
        errorMsg: '',
        items: items
      });
    }).catch((error) => {
      let errorMsg = '';
      if (error.response) {
        if (error.response.data && error.response.data['error_msg']) {
          errorMsg = error.response.data['error_msg'];
        } else {
          errorMsg = gettext('Error');
        }
      } else {
        errorMsg = gettext('Please check the network.');
      }
      this.setState({
        isLoading: false,
        errorMsg: errorMsg
      });
    });
  }

  renderPath = () => {
    // path: '/', or '/g/'
    if (path == '/') {
      return dirName;
    }

    let pathList = path.substr(0, path.length -1).split('/');
    return (
      <React.Fragment>
        <a href="?p=/">{dirName}</a>
        <span> / </span>
        {pathList.map((item, index) => {
          if (index > 0 && index != pathList.length - 1) {
            return (
              <React.Fragment key={index}>
                <a href={`?p=${encodeURIComponent(pathList.slice(0, index+1).join('/'))}`}>{pathList[index]}</a>
                <span> / </span>
              </React.Fragment>
            );
          }
        }
        )}
        {pathList[pathList.length - 1]}
      </React.Fragment>
    );
  }

  zipDownloadFolder = (folderPath) => {
    this.setState({
      isZipDialogOpen: true,
      zipFolderPath: folderPath
    });
  }

  closeZipDialog = () => {
    this.setState({
      isZipDialogOpen: false,
      zipFolderPath: ''
    });
  }

  render() {
    return (
      <React.Fragment>
        <div className="h-100 d-flex flex-column">
          <div className="top-header d-flex justify-content-between">
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
            {loginUser && <Account />}
          </div>
          <div className="o-auto">
            <div className="shared-dir-view-main">
              <h2 className="title">{dirName}</h2>
              <p>{gettext('Shared by: ')}{sharedBy}</p>
              <div className="d-flex justify-content-between align-items-center op-bar">
                <p className="m-0">{gettext('Current path: ')}{this.renderPath()}</p>
                {showDownloadIcon &&
                <Button color="success" onClick={this.zipDownloadFolder.bind(this, path)}>{gettext('ZIP')}</Button>
                }
              </div>
              <Content
                data={this.state}
                zipDownloadFolder={this.zipDownloadFolder}
              />
            </div>
          </div>
        </div>
        {this.state.isZipDialogOpen &&
        <ModalPortal>
          <ShareLinkZipDownloadDialog 
            token={token}
            path={this.state.zipFolderPath}
            toggleDialog={this.closeZipDialog}
          />
        </ModalPortal>
        }
      </React.Fragment>
    );
  }
}

class Content extends React.Component {
  render() {
    const { isLoading, errorMsg, items } = this.props.data;
    
    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-6 text-center">{errorMsg}</p>;
    }

    return (
      <table className="table-hover">
        <thead>
          <tr>
            <th width="5%"></th>
            <th width="55%">{gettext('Name')}</th>
            <th width="14%">{gettext('Size')}</th>
            <th width="16%">{gettext('Last Update')}</th>
            <th width="10%">{gettext('Operations')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            return <Item 
              key={index}
              item={item}
              zipDownloadFolder={this.props.zipDownloadFolder}
            />;
          })}
        </tbody>
      </table>
    );
  }
}

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = { 
      isIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({isIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isIconShown: false});
  }

  zipDownloadFolder = (e) => {
    e.preventDefault();
    this.props.zipDownloadFolder.bind(this, this.props.item.folder_path)();
  }

  render() {
    const item = this.props.item;
    const { isIconShown } = this.state;

    if (item.is_dir) {
      return (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td className="text-center"><img src={Utils.getFolderIconUrl()} alt="" width="24" /></td>
          <td>
            <a href={`?p=${encodeURIComponent(item.folder_path.substr(0, item.folder_path.length - 1))}`}>{item.folder_name}</a>
          </td>
          <td></td>
          <td>{moment(item.last_modified).format('YYYY-MM-DD')}</td>
          <td>
            {showDownloadIcon &&
            <a className={isIconShown ? '' : ' invisible'} href="#" onClick={this.zipDownloadFolder} title={gettext('Download')} aria-label={gettext('Download')}>
              <img src={`${mediaUrl}img/download.png`} alt={gettext('Download')} />
            </a>
            }
          </td>
        </tr>
      );
    } else {
      const fileURL = `${siteRoot}d/${token}/files/?p=${encodeURIComponent(item.file_path)}`;
      return (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td className="text-center"><img src={Utils.getFileIconUrl(item.file_name)} alt="" width="24" /></td>
          <td>
            <a href={fileURL}>{item.file_name}</a>
          </td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td>{moment(item.last_modified).format('YYYY-MM-DD')}</td>
          <td>
            {showDownloadIcon &&
            <a className={isIconShown ? '' : ' invisible'} href={`${fileURL}&dl=1`} title={gettext('Download')} aria-label={gettext('Download')}>
              <img src={`${mediaUrl}img/download.png`} alt={gettext('Download')} />
            </a>
            }
          </td>
        </tr>
      );
    }
  }
}

ReactDOM.render(
  <SharedDirView />,
  document.getElementById('wrapper')
);
