import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import SharedRepoListItem from './shared-repo-list-item';
import toaster from '../toast';
import LibsMobileThead from '../libs-mobile-thead';
import Loading from '../loading';
import { LIST_MODE } from '../dir-view-mode/constants';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, handleContextClick } from '../context-menu/actions';

const propTypes = {
  currentViewMode: PropTypes.string,
  libraryType: PropTypes.string,
  currentGroup: PropTypes.object,
  isShowTableThread: PropTypes.bool,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortItems: PropTypes.func,
  repoList: PropTypes.array.isRequired,
  onItemUnshare: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func,
  onItemRename: PropTypes.func,
  hasNextPage: PropTypes.bool,
  inAllLibs: PropTypes.bool,
  onTransferRepo: PropTypes.func,
};

class SharedRepoListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
    this.repoItems = [];
  }

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  getSortMetaData = () => {
    return {
      sortByName: this.props.sortBy == 'name',
      sortByTime: this.props.sortBy == 'time',
      sortBySize: this.props.sortBy == 'size',
      sortIcon: this.props.sortOrder == 'asc' ? <span aria-hidden="true" className="sf3-font sf3-font-down rotate-180 d-inline-block"></span> : <span aria-hidden="true" className="sf3-font sf3-font-down"></span>
    };
  };

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
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
      this.repoItems[index].onMenuItemClick(event);
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
              ref={this.setRepoItemRef(index)}
              key={repo.repo_id}
              repo={repo}
              libraryType={this.props.libraryType}
              currentGroup={this.props.currentGroup}
              isItemFreezed={this.state.isItemFreezed}
              onFreezedItem={this.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
              onTransferRepo={this.props.onTransferRepo}
              onItemUnshare={this.props.onItemUnshare}
              onItemDelete={this.props.onItemDelete}
              onItemRename={this.props.onItemRename}
              currentViewMode={currentViewMode}
              onContextMenu={this.onContextMenu}
            />
          );
        })}
      </Fragment>
    );
  };

  renderPCUI = () => {
    const { currentViewMode, currentGroup, libraryType, inAllLibs } = this.props;
    const { sortByName, sortByTime, sortBySize, sortIcon } = this.getSortMetaData();

    const content = currentViewMode == LIST_MODE ? (
      <table className={classNames({ 'table-thead-hidden': inAllLibs })}>
        <thead>
          <tr>
            <th width="4%"></th>
            <th width="3%"><span className="sr-only">{gettext('Library Type')}</span></th>
            <th width="35%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
            <th width="10%"><span className="sr-only">{gettext('Actions')}</span></th>
            <th width="14%"><a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBySize && sortIcon}</a></th>
            <th width="17%"><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortByTime && sortIcon}</a></th>
            <th width="17%">{gettext('Owner')}</th>
          </tr>
        </thead>
        <tbody>
          {this.renderRepoListView()}
        </tbody>
      </table>
    ) : (
      <div className="d-flex justify-content-between flex-wrap">
        {this.renderRepoListView()}
      </div>
    );

    return (
      <>
        {content}
        <ContextMenu
          id={`${libraryType === 'public' ? 'shared-repo-item-menu' : `shared-repo-item-menu-${currentGroup.id}`}`}
          onMenuItemClick={this.onMenuItemClick}
        />
      </>
    );
  };

  renderMobileUI = () => {
    const { inAllLibs = false } = this.props;
    return (
      <table className="table-thead-hidden">
        <LibsMobileThead inAllLibs={inAllLibs} />
        <tbody>
          {this.renderRepoListView()}
        </tbody>
      </table>
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
