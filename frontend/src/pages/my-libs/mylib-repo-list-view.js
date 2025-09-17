import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import MediaQuery from 'react-responsive';
import { gettext, storages } from '../../utils/constants';
import MylibRepoListItem from './mylib-repo-list-item';
import LibsMobileThead from '../../components/libs-mobile-thead';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import ContextMenu from '../../components/context-menu/context-menu';
import { Utils } from '../../utils/utils';
import { hideMenu, handleContextClick } from '../../components/context-menu/actions';

const propTypes = {
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  repoList: PropTypes.array.isRequired,
  sortRepoList: PropTypes.func.isRequired,
  onRenameRepo: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  onTransferRepo: PropTypes.func.isRequired,
  inAllLibs: PropTypes.bool, // for 'My Libraries' in 'Files' page
  currentViewMode: PropTypes.string,
};

class MylibRepoListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
    this.repoItems = [];
  }

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
  };

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortRepoList(sortBy, sortOrder);
  };

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortRepoList(sortBy, sortOrder);
  };

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortRepoList(sortBy, sortOrder);
  };

  onContextMenu = (event, repo) => {
    event.preventDefault();
    const id = 'mylib-repo-item-menu';
    const menuList = Utils.getRepoOperationList(repo);
    handleContextClick(event, id, menuList, repo);
  };

  setRepoItemRef = (index) => item => {
    this.repoItems[index] = item;
  };

  getRepoIndex = (repo) => {
    return this.props.repoList.findIndex(item => {
      return item.repo_id === repo.repo_id;
    });
  };

  onMenuItemClick = (operation, currentObject) => {
    const index = this.getRepoIndex(currentObject);
    this.repoItems[index].onMenuItemClick(operation);

    hideMenu();
  };

  renderRepoListView = () => {
    return (
      <Fragment>
        {this.props.repoList.map((item, index) => {
          return (
            <MylibRepoListItem
              ref={this.setRepoItemRef(index)}
              key={item.repo_id}
              repo={item}
              isItemFreezed={this.state.isItemFreezed}
              onFreezedItem={this.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
              onRenameRepo={this.props.onRenameRepo}
              onDeleteRepo={this.props.onDeleteRepo}
              onTransferRepo={this.props.onTransferRepo}
              currentViewMode={this.props.currentViewMode}
              onContextMenu={this.onContextMenu}
              inAllLibs={this.props.inAllLibs}
            />
          );
        })}
      </Fragment>
    );
  };

  renderPCUI = () => {
    const { inAllLibs, currentViewMode = LIST_MODE } = this.props;
    const showStorageBackend = !inAllLibs && storages.length > 0;
    const sortIcon = this.props.sortOrder === 'asc' ? <span aria-hidden="true" className="sf3-font sf3-font-down rotate-180 d-inline-block"></span> : <span aria-hidden="true" className="sf3-font sf3-font-down"></span>;

    return currentViewMode == LIST_MODE ? (
      <table className={classNames({ 'table-thead-hidden': inAllLibs })}>
        <thead>
          <tr>
            <th width="4%"></th>
            <th width="3%"><span className="sr-only">{gettext('Library Type')}</span></th>
            <th width={showStorageBackend ? '36%' : '35%'}><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {this.props.sortBy === 'name' && sortIcon}</a></th>
            <th width="10%"><span className="sr-only">{gettext('Actions')}</span></th>
            <th width={showStorageBackend ? '15%' : '14%'}><a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {this.props.sortBy === 'size' && sortIcon}</a></th>
            {showStorageBackend ? <th width="17%">{gettext('Storage Backend')}</th> : null}
            <th width={showStorageBackend ? '15%' : '34%'}><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {this.props.sortBy === 'time' && sortIcon}</a></th>
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
  };

  renderMobileUI = () => {
    const { inAllLibs } = this.props;
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
    return (
      <Fragment>
        <MediaQuery query="(min-width: 768px)">
          {this.renderPCUI()}
        </MediaQuery>
        <MediaQuery query="(max-width: 767.8px)">
          {this.renderMobileUI()}
        </MediaQuery>
        <ContextMenu
          id="mylib-repo-item-menu"
          onMenuItemClick={this.onMenuItemClick}
        />
      </Fragment>
    );
  }
}

MylibRepoListView.propTypes = propTypes;

export default MylibRepoListView;
