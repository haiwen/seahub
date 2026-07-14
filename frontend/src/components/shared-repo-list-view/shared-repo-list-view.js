import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import LibsMobileThead from '../libs-mobile-thead';
import SharedRepoListItem from './shared-repo-list-item';
import toaster from '../toast';
import Loading from '../loading';
import { LIST_MODE } from '../dir-view-mode/constants';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, handleContextClick } from '../context-menu/actions';
import RepoListCard from '../repo-list-card/repo-list-card';

const propTypes = {
  currentViewMode: PropTypes.string,
  libraryType: PropTypes.string,
  currentGroup: PropTypes.object,
  isShowTableThread: PropTypes.bool,
  repoList: PropTypes.array.isRequired,
  onItemUnshare: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func,
  onItemRename: PropTypes.func,
  hasNextPage: PropTypes.bool,
  inAllLibs: PropTypes.bool,
  onTransferRepo: PropTypes.func,
  onToggleStarRepo: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool,
  onFreezedItem: PropTypes.func,
  onUnfreezedItem: PropTypes.func,
};

class SharedRepoListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
    this.repoItems = [];
  }

  setItemFreezed = (isItemFreezed) => {
    if (this.props.onFreezedItem && this.props.onUnfreezedItem) {
      isItemFreezed ? this.props.onFreezedItem() : this.props.onUnfreezedItem();
      return;
    }
    this.setState({ isItemFreezed });
  };

  onFreezedItem = () => {
    this.setItemFreezed(true);
  };

  onUnfreezedItem = () => {
    this.setItemFreezed(false);
  };

  getIsItemFreezed = () => {
    if (typeof this.props.isItemFreezed === 'boolean') {
      return this.props.isItemFreezed;
    }
    return this.state.isItemFreezed;
  };

  onItemRename = (repo, newName) => {
    let isDuplicated = this.props.repoList.some(item => {
      return item.name === newName;
    });
    if (isDuplicated) {
      let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
      errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
      toaster.danger(errMessage);
      return false;
    }
    this.props.onItemRename(repo, newName);
  };

  setRepoItemRef = (index) => item => {
    this.repoItems[index] = item;
  };

  getRepoIndex = (repo) => {
    return this.props.repoList.findIndex(item => {
      return item.repo_id === repo.repo_id;
    });
  };

  onMenuItemClick = (operation, currentObject, event) => {
    const index = this.getRepoIndex(currentObject);
    if (this.repoItems[index]) {
      this.repoItems[index].onMenuItemClick(operation, event);
    }
    hideMenu();
  };

  onContextMenu = (event, repo) => {
    event.preventDefault();
    const { libraryType, currentGroup } = this.props;
    const isPublic = libraryType === 'public';
    const id = isPublic ? 'shared-repo-item-menu' : `shared-repo-item-menu-${currentGroup.id}`;
    const menuList = Utils.getSharedRepoOperationList(repo, currentGroup, isPublic);
    handleContextClick(event, id, menuList, repo);
  };

  renderRepoListView = () => {
    const { currentViewMode } = this.props;
    return (
      <Fragment>
        {this.props.repoList.map((repo, index) => {
          return (
            <SharedRepoListItem
              idx={index}
              ref={this.setRepoItemRef(index)}
              key={repo.repo_id}
              repo={repo}
              libraryType={this.props.libraryType}
              currentGroup={this.props.currentGroup}
              isItemFreezed={this.getIsItemFreezed()}
              onFreezedItem={this.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
              onTransferRepo={this.props.onTransferRepo}
              onToggleStarRepo={this.props.onToggleStarRepo}
              onItemUnshare={this.props.onItemUnshare}
              onItemDelete={this.props.onItemDelete}
              onItemRename={this.props.onItemRename}
              currentViewMode={currentViewMode}
              onContextMenu={this.onContextMenu}
              updateRepoStatus={this.props.updateRepoStatus}
            />
          );
        })}
      </Fragment>
    );
  };

  renderPCUI = () => {
    const { currentViewMode, currentGroup, libraryType } = this.props;

    if (currentViewMode === LIST_MODE) {
      return (
        <>
          <RepoListCard>
            {this.renderRepoListView()}
          </RepoListCard>
          <ContextMenu
            id={`${libraryType === 'public' ? 'shared-repo-item-menu' : `shared-repo-item-menu-${currentGroup.id}`}`}
            onMenuItemClick={this.onMenuItemClick}
          />
        </>
      );
    }

    // Grid mode
    return (
      <>
        <div className="repo-grid-container">
          {this.renderRepoListView()}
        </div>
        <ContextMenu
          id={`${libraryType === 'public' ? 'shared-repo-item-menu' : `shared-repo-item-menu-${currentGroup.id}`}`}
          onMenuItemClick={this.onMenuItemClick}
        />
      </>
    );
  };

  renderMobileUI = () => {
    return (
      <div className="library-list-mobile-container">
        <table className="table-thead-hidden">
          <LibsMobileThead />
          <tbody>
            {this.renderRepoListView()}
          </tbody>
        </table>
      </div>
    );
  };

  render() {
    const table = Utils.isDesktop() ? this.renderPCUI() : this.renderMobileUI();
    if (this.props.hasNextPage) {
      return (
        <Fragment>
          {table}
          <Loading />
        </Fragment>
      );
    } else {
      return table;
    }
  }
}

SharedRepoListView.propTypes = propTypes;

export default SharedRepoListView;
