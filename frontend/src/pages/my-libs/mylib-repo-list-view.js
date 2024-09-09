import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import { gettext, storages } from '../../utils/constants';
import MylibRepoListItem from './mylib-repo-list-item';
import LibsMobileThead from '../../components/libs-mobile-thead';
import { LIST_MODE } from '../../components/dir-view-mode/constants';

const propTypes = {
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  repoList: PropTypes.array.isRequired,
  sortRepoList: PropTypes.func.isRequired,
  onRenameRepo: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  onTransferRepo: PropTypes.func.isRequired,
  onMonitorRepo: PropTypes.func.isRequired,
  inAllLibs: PropTypes.bool, // for 'My Libraries' in 'Files' page
  currentViewMode: PropTypes.string,
};

class MylibRepoListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
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
              currentViewMode={this.props.currentViewMode}
            />
          );
        })}
      </Fragment>
    );
  };

  renderPCUI = () => {
    const { inAllLibs, currentViewMode = LIST_MODE } = this.props;
    const showStorageBackend = !inAllLibs && storages.length > 0;
    const sortIcon = this.props.sortOrder === 'asc' ? <span className="sf3-font sf3-font-down rotate-180 d-inline-block"></span> : <span className="sf3-font sf3-font-down"></span>;

    return currentViewMode == LIST_MODE ? (
      <table className={inAllLibs ? 'table-thead-hidden' : ''}>
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
      </Fragment>
    );
  }
}

MylibRepoListView.propTypes = propTypes;

export default MylibRepoListView;
