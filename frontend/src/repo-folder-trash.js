import React from 'react';
import { createRoot } from 'react-dom/client';
import PropTypes from 'prop-types';
import { navigate } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import { Utils } from './utils/utils';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
import ModalPortal from './components/modal-portal';
import toaster from './components/toast';
import CommonToolbar from './components/toolbar/common-toolbar';
import CleanTrash from './components/dialog/clean-trash';

import './css/toolbar.css';
import './css/search.css';

import './css/repo-folder-trash.css';

const {
  repoID,
  repoFolderName,
  path,
  enableUserCleanTrash,
  isRepoAdmin
} = window.app.pageOptions;

class RepoFolderTrash extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      items: [],
      scanStat: null,
      more: false,
      isCleanTrashDialogOpen: false,
    };
  }

  componentDidMount() {
    this.getItems();
  }

  getItems = (scanStat) => {
    seafileAPI.getRepoFolderTrash(repoID, path, scanStat).then((res) => {
      const { data, more, scan_stat } = res.data;
      if (!data.length && more) {
        this.getItems(scan_stat);
      } else {
        this.setState({
          isLoading: false,
          items: this.state.items.concat(data),
          more: more,
          scanStat: scan_stat
        });
      }
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  getMore = () => {
    this.setState({
      isLoading: true
    });
    this.getItems(this.state.scanStat);
  };

  onSearchedClick = (selectedItem) => {
    if (selectedItem.is_dir === true) {
      let url = siteRoot + 'library/' + selectedItem.repo_id + '/' + selectedItem.repo_name + selectedItem.path;
      navigate(url, { replace: true });
    } else {
      let url = siteRoot + 'lib/' + selectedItem.repo_id + '/file' + Utils.encodePath(selectedItem.path);
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  };

  goBack = (e) => {
    e.preventDefault();
    window.history.back();
  };

  cleanTrash = () => {
    this.toggleCleanTrashDialog();
  };

  toggleCleanTrashDialog = () => {
    this.setState({
      isCleanTrashDialogOpen: !this.state.isCleanTrashDialogOpen
    });
  };

  refreshTrash = () => {
    this.setState({
      isLoading: true,
      errorMsg: '',
      items: [],
      scanStat: null,
      more: false,
      showFolder: false
    });
    this.getItems();
  };

  renderFolder = (commitID, baseDir, folderPath) => {
    this.setState({
      showFolder: true,
      commitID: commitID,
      baseDir: baseDir,
      folderPath: folderPath,
      folderItems: [],
      isLoading: true
    });

    seafileAPI.listCommitDir(repoID, commitID, `${baseDir.substr(0, baseDir.length - 1)}${folderPath}`).then((res) => {
      this.setState({
        isLoading: false,
        folderItems: res.data.dirent_list
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            isLoading: false,
            errorMsg: gettext('Permission denied')
          });
        } else {
          this.setState({
            isLoading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          isLoading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  };

  clickRoot = (e) => {
    e.preventDefault();
    this.refreshTrash();
  };

  clickFolderPath = (folderPath, e) => {
    e.preventDefault();
    const { commitID, baseDir } = this.state;
    this.renderFolder(commitID, baseDir, folderPath);
  };

  renderFolderPath = () => {
    const pathList = this.state.folderPath.split('/');
    return (
      <React.Fragment>
        <a href="#" onClick={this.clickRoot} className="text-truncate" title={repoFolderName}>{repoFolderName}</a>
        <span className="mx-1">/</span>
        {pathList.map((item, index) => {
          if (index > 0 && index != pathList.length - 1) {
            return (
              <React.Fragment key={index}>
                <a className="text-truncate" href="#" onClick={this.clickFolderPath.bind(this, pathList.slice(0, index + 1).join('/'))} title={pathList[index]}>{pathList[index]}</a>
                <span className="mx-1">/</span>
              </React.Fragment>
            );
          }
          return null;
        }
        )}
        <span className="text-truncate" title={pathList[pathList.length - 1]}>{pathList[pathList.length - 1]}</span>
      </React.Fragment>
    );
  };

  render() {
    const { isCleanTrashDialogOpen, showFolder } = this.state;

    let title = gettext('{placeholder} Trash');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoFolderName) + '</span>');

    return (
      <React.Fragment>
        <div className="h-100 d-flex flex-column">
          <div className="top-header d-flex justify-content-between">
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
            <CommonToolbar onSearchedClick={this.onSearchedClick} />
          </div>
          <div className="flex-auto container-fluid pt-4 pb-6 o-auto">
            <div className="row">
              <div className="col-md-10 offset-md-1">
                <h2 dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></h2>
                <a href="#" className="go-back" title={gettext('Back')} onClick={this.goBack} role={gettext('Back')}>
                  <span className="sf3-font sf3-font-down rotate-90 d-inline-block"></span>
                </a>
                <div className="d-flex justify-content-between align-items-center op-bar">
                  <p className="m-0 text-truncate d-flex"><span className="mr-1">{gettext('Current path: ')}</span>{showFolder ? this.renderFolderPath() : <span className="text-truncate" title={repoFolderName}>{repoFolderName}</span>}</p>
                  {(path === '/' && enableUserCleanTrash && !showFolder && isRepoAdmin) &&
                  <button className="btn btn-secondary clean flex-shrink-0 ml-4" onClick={this.cleanTrash}>{gettext('Clean')}</button>
                  }
                </div>
                <Content
                  data={this.state}
                  getMore={this.getMore}
                  renderFolder={this.renderFolder}
                />
              </div>
            </div>
          </div>
        </div>
        {isCleanTrashDialogOpen &&
        <ModalPortal>
          <CleanTrash
            repoID={repoID}
            refreshTrash={this.refreshTrash}
            toggleDialog={this.toggleCleanTrashDialog}
          />
        </ModalPortal>
        }
      </React.Fragment>
    );
  }
}

class Content extends React.Component {

  constructor(props) {
    super(props);
    this.theadData = [
      { width: '5%', text: '' },
      { width: '20%', text: gettext('Name') },
      { width: '40%', text: gettext('Original path') },
      { width: '12%', text: gettext('Delete time') },
      { width: '13%', text: gettext('Size') },
      { width: '10%', text: '' }
    ];
  }

  render() {
    const { isLoading, errorMsg, items, more, showFolder, commitID, baseDir, folderPath, folderItems } = this.props.data;

    return (
      <React.Fragment>
        <table className="table-hover">
          <thead>
            <tr>
              {this.theadData.map((item, index) => {
                return <th key={index} width={item.width}>{item.text}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {showFolder ?
              folderItems.map((item, index) => {
                return <FolderItem
                  key={index}
                  item={item}
                  commitID={commitID}
                  baseDir={baseDir}
                  folderPath={folderPath}
                  renderFolder={this.props.renderFolder}
                />;
              }) :
              items.map((item, index) => {
                return <Item
                  key={index}
                  item={item}
                  renderFolder={this.props.renderFolder}
                />;
              })}
          </tbody>
        </table>
        {isLoading && <Loading />}
        {errorMsg && <p className="error mt-6 text-center">{errorMsg}</p>}
        {(more && !isLoading && !showFolder) && (
          <button className="btn btn-block more mt-6" onClick={this.props.getMore}>{gettext('More')}</button>
        )}
      </React.Fragment>
    );
  }
}

Content.propTypes = {
  data: PropTypes.object.isRequired,
  getMore: PropTypes.func.isRequired,
  renderFolder: PropTypes.func.isRequired,
};


class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      restored: false,
      isIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({ isIconShown: true });
  };

  handleMouseOut = () => {
    this.setState({ isIconShown: false });
  };

  restoreItem = (e) => {
    e.preventDefault();

    const item = this.props.item;
    const { commit_id, parent_dir, obj_name } = item;
    const path = parent_dir + obj_name;
    const request = item.is_dir ?
      seafileAPI.restoreFolder(repoID, commit_id, path) :
      seafileAPI.restoreFile(repoID, commit_id, path);
    request.then((res) => {
      this.setState({
        restored: true
      });
      toaster.success(gettext('Restored 1 item'));
    }).catch((error) => {
      let errorMsg = '';
      if (error.response) {
        errorMsg = error.response.data.error_msg || gettext('Error');
      } else {
        errorMsg = gettext('Please check the network.');
      }
      toaster.danger(errorMsg);
    });
  };

  renderFolder = (e) => {
    e.preventDefault();
    const item = this.props.item;
    this.props.renderFolder(item.commit_id, item.parent_dir, Utils.joinPath('/', item.obj_name));
  };

  render() {
    const item = this.props.item;
    const { restored, isIconShown } = this.state;

    if (restored) {
      return null;
    }

    return item.is_dir ? (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
        <td className="text-center"><img src={Utils.getFolderIconUrl()} alt={gettext('Folder')} width="24" /></td>
        <td><a href="#" onClick={this.renderFolder}>{item.obj_name}</a></td>
        <td>{item.parent_dir}</td>
        <td title={dayjs(item.deleted_time).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(item.deleted_time).format('YYYY-MM-DD')}</td>
        <td></td>
        <td>
          <a href="#" className={isIconShown ? '' : 'invisible'} onClick={this.restoreItem} role="button">{gettext('Restore')}</a>
        </td>
      </tr>
    ) : (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
        <td className="text-center"><img src={Utils.getFileIconUrl(item.obj_name)} alt={gettext('File')} width="24" /></td>
        <td><a href={`${siteRoot}repo/${repoID}/trash/files/?obj_id=${item.obj_id}&commit_id=${item.commit_id}&base=${encodeURIComponent(item.parent_dir)}&p=${encodeURIComponent('/' + item.obj_name)}`} target="_blank" rel="noreferrer">{item.obj_name}</a></td>
        <td>{item.parent_dir}</td>
        <td title={dayjs(item.deleted_time).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(item.deleted_time).format('YYYY-MM-DD')}</td>
        <td>{Utils.bytesToSize(item.size)}</td>
        <td>
          <a href="#" className={isIconShown ? '' : 'invisible'} onClick={this.restoreItem} role="button">{gettext('Restore')}</a>
        </td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  renderFolder: PropTypes.func.isRequired,
};

class FolderItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({ isIconShown: true });
  };

  handleMouseOut = () => {
    this.setState({ isIconShown: false });
  };

  renderFolder = (e) => {
    e.preventDefault();

    const item = this.props.item;
    const { commitID, baseDir, folderPath } = this.props;
    this.props.renderFolder(commitID, baseDir, Utils.joinPath(folderPath, item.name));
  };

  render() {
    const item = this.props.item;
    const { commitID, baseDir, folderPath } = this.props;

    return item.type == 'dir' ? (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td className="text-center"><img src={Utils.getFolderIconUrl()} alt={gettext('Folder')} width="24" /></td>
        <td><a href="#" onClick={this.renderFolder}>{item.name}</a></td>
        <td>{item.parent_dir}</td>
        <td></td>
        <td></td>
      </tr>
    ) : (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td className="text-center"><img src={Utils.getFileIconUrl(item.name)} alt={gettext('File')} width="24" /></td>
        <td><a href={`${siteRoot}repo/${repoID}/trash/files/?obj_id=${item.obj_id}&commit_id=${commitID}&base=${encodeURIComponent(baseDir)}&p=${encodeURIComponent(Utils.joinPath(folderPath, item.name))}`} target="_blank" rel="noreferrer">{item.name}</a></td>
        <td>{item.parent_dir}</td>
        <td></td>
        <td>{Utils.bytesToSize(item.size)}</td>
        <td></td>
      </tr>
    );
  }
}

FolderItem.propTypes = {
  item: PropTypes.object.isRequired,
  commitID: PropTypes.string.isRequired,
  baseDir: PropTypes.string.isRequired,
  folderPath: PropTypes.string.isRequired,
  renderFolder: PropTypes.func.isRequired,
};

const root = createRoot(document.getElementById('wrapper'));
root.render(<RepoFolderTrash />);
