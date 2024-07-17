import React from 'react';
import PropTypes from 'prop-types';
import { navigate } from '@gatsbyjs/reach-router';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import moment from 'moment';
import { Utils } from '../../utils/utils';
import {gettext, siteRoot, enableUserCleanTrash, username} from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { repotrashAPI } from '../../utils/repo-trash-api';
import Loading from '../../components/loading';
import ModalPortal from '../../components/modal-portal';
import toaster from '../../components/toast';
import CleanTrash from '../../components/dialog/clean-trash';
import Paginator from '../paginator';

import '../../css/toolbar.css';
import '../../css/search.css';
import '../../css/trash-dialog.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  showTrashDialog: PropTypes.bool.isRequired,
  toggleTrashDialog: PropTypes.func.isRequired
};

class TrashDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      items: [],
      scanStat: null,
      more: false,
      isCleanTrashDialogOpen: false,
      trashType: 0,
      isOldTrashDialogOpen: false,
      currentPage: 1,
      perPage: 100,
      hasNextPage: false
    };
  }

  componentDidMount() {
    this.getItems2();
  }

  getItems2 = (page) => {
    repotrashAPI.getRepoFolderTrash2(this.props.repoID, page, this.state.perPage).then((res) => {
      const { items, total_count } = res.data;
      if (!page){
        page = 1;
      }
      this.setState({
        currentPage: page,
        hasNextPage: total_count - page * this.state.perPage > 0,
        isLoading: false,
        items: items,
        more: false
      });
    });
  };

  onSearchedClick = (selectedItem) => {
    if (selectedItem.is_dir === true) {
      let url = siteRoot + 'library/' + selectedItem.repo_id + '/' + selectedItem.repo_name + selectedItem.path;
      navigate(url, {repalce: true});
    } else {
      let url = siteRoot + 'lib/' + selectedItem.repo_id + '/file' + Utils.encodePath(selectedItem.path);
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getItems2(1);
    });
  };
  cleanTrash = () => {
    this.toggleCleanTrashDialog();
  };

  toggleCleanTrashDialog = () => {
    this.setState({
      isCleanTrashDialogOpen: !this.state.isCleanTrashDialogOpen
    });
  };

  refreshTrash2 = () => {
    this.setState({
      isLoading: true,
      errorMsg: '',
      items: [],
      scanStat: null,
      more: false,
      showFolder: false
    });
    this.getItems2();
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

    seafileAPI.listCommitDir(this.props.repoID, commitID, `${baseDir.substr(0, baseDir.length - 1)}${folderPath}`).then((res) => {
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

  render() {
    const { showTrashDialog, toggleTrashDialog } = this.props;
    const { isCleanTrashDialogOpen, showFolder } = this.state;
    const isRepoAdmin = this.props.currentRepoInfo.owner_email === username || this.props.currentRepoInfo.is_admin;
    const repoFolderName = this.props.currentRepoInfo.repo_name;
    const oldTrashUrl = siteRoot + 'repo/' + this.props.repoID + '/trash/';
    let title = gettext('{placeholder} Trash');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoFolderName) + '</span>');

    return (
      <Modal className="trash-dialog" isOpen={showTrashDialog} toggle={toggleTrashDialog}>
        <ModalHeader
          close={
            <>
              <a className="trash-dialog-old-page" href={oldTrashUrl}>{gettext('Visit old version page')}</a>
              {(enableUserCleanTrash && !showFolder && isRepoAdmin) &&
                <button className="btn btn-secondary clean flex-shrink-0 ml-4" onClick={this.cleanTrash}>{gettext('Clean')}</button>
              }
              <span aria-hidden="true" className="trash-dialog-close-icon sf3-font sf3-font-x-01 ml-4" onClick={toggleTrashDialog}></span>
            </>
          }
        >
          <div dangerouslySetInnerHTML={{__html: title}}></div>
        </ModalHeader>
        <ModalBody>
          <Content
            data={this.state}
            repoID={this.props.repoID}
            getMore={this.getMore}
            currentPage={this.state.currentPage}
            curPerPage={this.state.perPage}
            hasNextPage={this.state.hasNextPage}
            renderFolder={this.renderFolder}
            getListByPage={this.getItems2}
            resetPerPage={this.resetPerPage}
          />
          {isCleanTrashDialogOpen &&
          <ModalPortal>
            <CleanTrash
              repoID={this.props.repoID}
              refreshTrash={this.refreshTrash2}
              toggleDialog={this.toggleCleanTrashDialog}
            />
          </ModalPortal>
          }
        </ModalBody>
      </Modal>
    );
  }
}

class Content extends React.Component {

  constructor(props) {
    super(props);
    this.theadData = [
      {width: '5%', text: ''},
      {width: '20%', text: gettext('Name')},
      {width: '40%', text: gettext('Original path')},
      {width: '12%', text: gettext('Delete Time')},
      {width: '13%', text: gettext('Size')},
      {width: '10%', text: ''}
    ];
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  };

  render() {
    const { isLoading, errorMsg, items, more, showFolder, commitID, baseDir, folderPath, folderItems } = this.props.data;
    const {
      curPerPage, currentPage, hasNextPage
    } = this.props;
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
                  repoID={this.props.repoID}
                  commitID={commitID}
                  baseDir={baseDir}
                  folderPath={folderPath}
                  renderFolder={this.props.renderFolder}
                />;
              }) :
              items.map((item, index) => {
                return <Item
                  key={index}
                  repoID={this.props.repoID}
                  item={item}
                  renderFolder={this.props.renderFolder}
                />;
              })}
          </tbody>
        </table>
        <Paginator
          gotoPreviousPage={this.getPreviousPage}
          gotoNextPage={this.getNextPage}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          curPerPage={curPerPage}
          resetPerPage={this.props.resetPerPage}
        />
      </React.Fragment>
    );
  }
}

Content.propTypes = {
  data: PropTypes.object.isRequired,
  getMore: PropTypes.func,
  renderFolder: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  getListByPage: PropTypes.func.isRequired,
  resetPerPage: PropTypes.func.isRequired,
  currentPage: PropTypes.number.isRequired,
  curPerPage: PropTypes.number.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
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
    this.setState({isIconShown: true});
  };

  handleMouseOut = () => {
    this.setState({isIconShown: false});
  };

  restoreItem = (e) => {
    e.preventDefault();
    const item = this.props.item;
    const { commit_id, parent_dir, obj_name } = item;
    const path = parent_dir + obj_name;
    const request = item.is_dir ?
      seafileAPI.restoreFolder(this.props.repoID, commit_id, path) :
      seafileAPI.restoreFile(this.props.repoID, commit_id, path);
    request.then((res) => {
      this.setState({
        restored: true
      });
      toaster.success(gettext('Successfully restored 1 item.'));
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
        <td className="text-center"><img src={Utils.getFolderIconUrl()} alt={gettext('Directory')} width="24" /></td>
        <td><a href="#" onClick={this.renderFolder}>{item.obj_name}</a></td>
        <td>{item.parent_dir}</td>
        <td title={moment(item.deleted_time).format('LLLL')}>{moment(item.deleted_time).format('YYYY-MM-DD')}</td>
        <td></td>
        <td>
          <a href="#" className={isIconShown ? '': 'invisible'} onClick={this.restoreItem} role="button">{gettext('Restore')}</a>
        </td>
      </tr>
    ) : (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
        <td className="text-center"><img src={Utils.getFileIconUrl(item.obj_name)} alt={gettext('File')} width="24" /></td>
        <td><a href={`${siteRoot}repo/${this.props.repoID}/trash/files/?obj_id=${item.obj_id}&commit_id=${item.commit_id}&base=${encodeURIComponent(item.parent_dir)}&p=${encodeURIComponent('/' + item.obj_name)}`} target="_blank" rel="noreferrer">{item.obj_name}</a></td>
        <td>{item.parent_dir}</td>
        <td title={moment(item.deleted_time).format('LLLL')}>{moment(item.deleted_time).format('YYYY-MM-DD')}</td>
        <td>{Utils.bytesToSize(item.size)}</td>
        <td>
          <a href="#" className={isIconShown ? '': 'invisible'} onClick={this.restoreItem} role="button">{gettext('Restore')}</a>
        </td>
      </tr>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  renderFolder: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired
};

class FolderItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({isIconShown: true});
  };

  handleMouseOut = () => {
    this.setState({isIconShown: false});
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
        <td className="text-center"><img src={Utils.getFolderIconUrl()} alt={gettext('Directory')} width="24" /></td>
        <td><a href="#" onClick={this.renderFolder}>{item.name}</a></td>
        <td>{item.parent_dir}</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    ) : (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td className="text-center">
          <img src={Utils.getFileIconUrl(item.name)} alt={gettext('File')} width="24" />
        </td>
        <td>
          <a href={`${siteRoot}repo/${this.props.repoID}/trash/files/?obj_id=${item.obj_id}&commit_id=${commitID}&base=${encodeURIComponent(baseDir)}&p=${encodeURIComponent(Utils.joinPath(folderPath, item.name))}`} target="_blank" rel="noreferrer">{item.name}</a>
        </td>
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
  repoID: PropTypes.string.isRequired,
  baseDir: PropTypes.string.isRequired,
  folderPath: PropTypes.string.isRequired,
  renderFolder: PropTypes.func.isRequired,
};

TrashDialog.propTypes = propTypes;

export default TrashDialog;
