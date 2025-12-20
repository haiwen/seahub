import React from 'react';
import PropTypes from 'prop-types';
import { navigate } from '@gatsbyjs/reach-router';
import { Modal, ModalBody, ModalHeader } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { gettext, siteRoot, enableUserCleanTrash, username } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { repoTrashAPI } from '../../../utils/repo-trash-api';
import ModalPortal from '../../modal-portal';
import Table from './table';
import CleanTrash from '../clean-trash';
import Paginator from '../../paginator';
import Loading from '../../loading';
import BackIcon from '../../back-icon';
import EmptyTip from '../../empty-tip';
import SearchTrash from './trash-search/search-trash';
import Icon from '../../icon';

import '../../../css/toolbar.css';
import '../../../css/search.css';
import './index.css';

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
      hasNextPage: false,
      searchKeyword: '',
      filteredItems: [],
      canSearch: true,
    };
  }

  componentDidMount() {
    this.getFolderTrash();
  }

  handleSearchResults = (result) => {
    if (result?.reset) {
      this.getFolderTrash(1);
      return;
    }

    const items = result?.items || [];

    this.setState({
      items,
      hasNextPage: result?.hasMore || false
    });
  };

  getFolderTrash = (page) => {
    repoTrashAPI.getRepoFolderTrash(this.props.repoID, page, this.state.perPage).then((res) => {
      const { items, total_count, can_search } = res.data;
      if (!page) {
        page = 1;
      }
      this.setState({
        currentPage: page,
        hasNextPage: total_count - page * this.state.perPage > 0,
        isLoading: false,
        items: items,
        more: false,
        canSearch: can_search
      });
    });
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

  searchTrash = (query) => {
    this.setState({ isSearching: true });

    repoTrashAPI.searchRepoFolderTrash(this.props.repoID, query)
      .then((res) => {
        this.setState({
          isSearching: false,
          items: res.data,
          currentPage: 1,
          hasNextPage: false
        });
      })
      .catch((error) => {
        this.setState({
          isSearching: false,
          errorMsg: gettext('Search failed')
        });
      });
  };

  getPreviousPage = () => {
    this.getFolderTrash(this.state.currentPage - 1);
  };

  getNextPage = () => {
    this.getFolderTrash(this.state.currentPage + 1);
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getFolderTrash(1);
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
    this.getFolderTrash();
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
        folderItems: res.data.dirent_list,
        canSearch: false,
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


  clickFolderPath = (folderPath, e) => {
    e.preventDefault();
    const { commitID, baseDir } = this.state;
    this.renderFolder(commitID, baseDir, folderPath);
  };

  clickRoot = (e) => {
    e.preventDefault();
    this.refreshTrash2();
  };

  renderFolderPath = () => {
    const pathList = this.state.folderPath.split('/');
    const repoFolderName = this.props.currentRepoInfo.repo_name;

    return (
      <React.Fragment>
        <a href="#" onClick={this.clickRoot} className="path-item" title={repoFolderName}>{repoFolderName}</a>
        <span className="path-split">/</span>
        {pathList.map((item, index) => {
          if (index > 0 && index != pathList.length - 1) {
            return (
              <React.Fragment key={index}>
                <a className="path-item" href="#" onClick={this.clickFolderPath.bind(this, pathList.slice(0, index + 1).join('/'))} title={pathList[index]}>{pathList[index]}</a>
                <span className="path-split">/</span>
              </React.Fragment>
            );
          }
          return null;
        }
        )}
        <span className="last-path-item" title={pathList[pathList.length - 1]}>{pathList[pathList.length - 1]}</span>
      </React.Fragment>
    );
  };

  render() {
    const { showTrashDialog, toggleTrashDialog, repoID } = this.props;
    const { isCleanTrashDialogOpen, showFolder, isLoading, items, perPage, currentPage, hasNextPage, canSearch } = this.state;
    const isRepoAdmin = this.props.currentRepoInfo.owner_email === username || this.props.currentRepoInfo.is_admin;
    const repoFolderName = this.props.currentRepoInfo.repo_name;
    const oldTrashUrl = siteRoot + 'repo/' + this.props.repoID + '/trash/';
    let title = gettext('{placeholder} Trash');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mr-1">' + Utils.HTMLescape(repoFolderName) + '</span>');

    const isDesktop = Utils.isDesktop();
    return (
      <>
        <Modal className="trash-dialog" isOpen={showTrashDialog} toggle={toggleTrashDialog}>
          <ModalHeader
            close={
              <div className="button-control">
                {isDesktop && <a className="trash-dialog-old-page" href={oldTrashUrl}>{gettext('Visit old version page')}</a>}
                {(enableUserCleanTrash && !showFolder && isRepoAdmin) &&
                  <button className="btn btn-secondary clean flex-shrink-0 ml-4" onClick={this.cleanTrash}>{gettext('Clean')}</button>
                }
                {isDesktop && (
                  <button type="button" className="close seahub-modal-btn" aria-label={gettext('Close')} title={gettext('Close')}onClick={toggleTrashDialog}>
                    <span className="seahub-modal-btn-inner">
                      <Icon symbol="close" />
                    </span>
                  </button>
                )}
              </div>
            }
          >
            {!isDesktop &&
              <BackIcon onClick={toggleTrashDialog} />
            }
            <span dangerouslySetInnerHTML={{ __html: title }}></span>
          </ModalHeader>
          <ModalBody>
            {isLoading && <Loading />}
            {!isLoading && canSearch &&
              <SearchTrash
                repoID={this.props.repoID}
                onSearchResults={this.handleSearchResults}
                placeholder={gettext('Search in trash')}
              />
            }
            {!isLoading && items.length === 0 &&
              <EmptyTip text={gettext('No file')} className="m-0" />
            }
            {!isLoading && items.length > 0 &&
              <>
                <div className="path-container dir-view-path mw-100 pb-2 mt-1">
                  <span className="path-label mr-1">{gettext('Current path: ')}</span>
                  {showFolder ?
                    this.renderFolderPath() :
                    <span className="last-path-item" title={repoFolderName}>{repoFolderName}</span>
                  }
                </div>
                <Table
                  repoID={repoID}
                  data={{
                    items: items,
                    showFolder: showFolder,
                    commitID: this.state.commitID,
                    baseDir: this.state.baseDir,
                    folderPath: this.state.folderPath,
                    folderItems: this.state.folderItems
                  }}
                  renderFolder={this.renderFolder}
                  isDesktop={isDesktop}
                />
                <Paginator
                  gotoPreviousPage={this.getPreviousPage}
                  gotoNextPage={this.getNextPage}
                  currentPage={currentPage}
                  hasNextPage={hasNextPage}
                  curPerPage={perPage}
                  resetPerPage={this.resetPerPage}
                  noURLUpdate={true}
                />
              </>
            }
          </ModalBody>
        </Modal>
        {isCleanTrashDialogOpen && (
          <ModalPortal>
            <CleanTrash
              repoID={repoID}
              refreshTrash={this.refreshTrash2}
              toggleDialog={this.toggleCleanTrashDialog}
            />
          </ModalPortal>
        )}
      </>
    );
  }
}

TrashDialog.propTypes = {
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  showTrashDialog: PropTypes.bool.isRequired,
  toggleTrashDialog: PropTypes.func.isRequired
};

export default TrashDialog;
