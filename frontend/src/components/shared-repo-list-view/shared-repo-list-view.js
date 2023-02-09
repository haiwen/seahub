import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import SharedRepoListItem from './shared-repo-list-item';
import toaster from '../toast';
import LibsMobileThead from '../libs-mobile-thead';
import Loading from '../loading';

const propTypes = {
  libraryType: PropTypes.string,
  currentGroup: PropTypes.object,
  isShowTableThread: PropTypes.bool,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortItems: PropTypes.func,
  repoList: PropTypes.array.isRequired,
  onItemUnshare: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func,
  onItemDetails: PropTypes.func,
  onItemRename: PropTypes.func,
  hasNextPage: PropTypes.bool
};

class SharedRepoListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
  }

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  getSortMetaData = () => {
    return {
      sortByName: this.props.sortBy == 'name',
      sortByTime: this.props.sortBy == 'time',
      sortBySize: this.props.sortBy == 'size',
      sortIcon: this.props.sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

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
  }

  renderRepoListView = () => {
    return (
      <Fragment>
        {this.props.repoList.map(repo => {
          return (
            <SharedRepoListItem
              key={repo.repo_id}
              repo={repo}
              libraryType={this.props.libraryType}
              currentGroup={this.props.currentGroup}
              isItemFreezed={this.state.isItemFreezed}
              onFreezedItem={this.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
              onItemUnshare={this.props.onItemUnshare}
              onItemDelete={this.props.onItemDelete}
              onItemDetails={this.props.onItemDetails}
              onItemRename={this.props.onItemRename}
              onMonitorRepo={this.props.onMonitorRepo}
            />
          );
        })}
      </Fragment>
    );
  }

  renderPCUI = () => {
    let isShowTableThread = this.props.isShowTableThread !== undefined ? this.props.isShowTableThread : true;

    const { sortByName, sortByTime, sortBySize, sortIcon } = this.getSortMetaData();

    return (
      <table className={isShowTableThread ? '' : 'table-thead-hidden'}>
        <thead>
          <tr>
            <th width="4%"></th>
            <th width="4%"><span className="sr-only">{gettext('Library Type')}</span></th>
            <th width="36%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
            <th width="12%"><span className="sr-only">{gettext('Actions')}</span></th>
            <th width={'14%'}><a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBySize && sortIcon}</a></th>
            <th width={'14%'}><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortByTime && sortIcon}</a></th>
            <th width="16%">{gettext('Owner')}</th>
          </tr>
        </thead>
        <tbody>
          {this.renderRepoListView()}
        </tbody>
      </table>
    );
  }

  renderMobileUI = () => {
    return (
      <table className="table-thead-hidden">
        <LibsMobileThead />
        <tbody>
          {this.renderRepoListView()}
        </tbody>
      </table>
    );
  }

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
