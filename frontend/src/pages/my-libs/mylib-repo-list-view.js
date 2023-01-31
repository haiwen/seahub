import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import { gettext, storages } from '../../utils/constants';
import MylibRepoListItem from './mylib-repo-list-item';
import LibsMobileThead from '../../components/libs-mobile-thead';

const propTypes = {
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  repoList: PropTypes.array.isRequired,
  sortRepoList: PropTypes.func.isRequired,
  onRenameRepo: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  onTransferRepo: PropTypes.func.isRequired,
  onRepoClick: PropTypes.func.isRequired,
};

class MylibRepoListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortRepoList(sortBy, sortOrder);
  }

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortRepoList(sortBy, sortOrder);
  }

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortRepoList(sortBy, sortOrder);
  }

  renderRepoListView = () => {
    return (
      <Fragment>
        {this.props.repoList.map(item => {
          return (
            <MylibRepoListItem
              key={item.repo_id}
              repo={item}
              isItemFreezed={this.state.isItemFreezed}
              onFreezedItem={this.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
              onRenameRepo={this.props.onRenameRepo}
              onDeleteRepo={this.props.onDeleteRepo}
              onTransferRepo={this.props.onTransferRepo}
              onMonitorRepo={this.props.onMonitorRepo}
              onRepoClick={this.props.onRepoClick}
            />
          );
        })}
      </Fragment>
    );
  }

  renderPCUI = () => {
    const showStorageBackend = storages.length > 0;
    const sortIcon = this.props.sortOrder === 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;
    return (
      <table>
        <thead>
          <tr>
            <th width="4%"></th>
            <th width="4%"><span className="sr-only">{gettext('Library Type')}</span></th>
            <th width={showStorageBackend ? '33%' : '38%'}><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {this.props.sortBy === 'name' && sortIcon}</a></th>
            <th width="14%"><span className="sr-only">{gettext('Actions')}</span></th>
            <th width={showStorageBackend ? '15%' : '20%'}><a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {this.props.sortBy === 'size' && sortIcon}</a></th>
            {showStorageBackend ? <th width="15%">{gettext('Storage Backend')}</th> : null}
            <th width={showStorageBackend ? '15%' : '20%'}><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {this.props.sortBy === 'time' && sortIcon}</a></th>
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
    return (
      <Fragment>
        <MediaQuery query="(min-width: 768px)">
          {this.renderPCUI()}
        </MediaQuery>
        <MediaQuery query="(max-width: 767.8px)">
          {this.renderMobileUI()}
        </MediaQuery>
      </Fragment>
    );
  }
}

MylibRepoListView.propTypes = propTypes;

export default MylibRepoListView;
