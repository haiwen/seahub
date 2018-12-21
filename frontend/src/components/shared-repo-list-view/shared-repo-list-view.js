import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import SharedRepoListItem from './shared-repo-list-item';

const propTypes = {
  libraryType: PropTypes.string,
  currentGroup: PropTypes.object,
  isShowTableThread: PropTypes.bool,
  repoList: PropTypes.array.isRequired,
  onItemUnshare: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
};

class SharedRepoListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
  }

  onFreezedItem = () => {
    this.setState({
      isItemFreezed: !this.state.isItemFreezed,
    });
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
              onItemUnshare={this.props.onItemUnshare}
              onItemDelete={this.props.onItemDelete}
            />
          );
        })}
      </Fragment>
    );
  }

  renderPCUI = () => {
    let isShowTableThread = this.props.isShowTableThread !== undefined ? this.props.isShowTableThread : true;
    return (
      <table>
        <thead className={isShowTableThread ? '' : 'table-thread-hidden'}>
          <tr>
            <th width="4%"><span className="sr-only">{gettext("Library Type")}</span></th>
            <th width="40%">{gettext("Name")}
              <a className="table-sort-op by-name" href="#">{/*TODO: sort*/}<span className="sort-icon icon-caret-down hide"></span></a>
            </th>
            <th width="12%"><span className="sr-only">{gettext("Actions")}</span></th>
            <th width={'14%'}>{gettext("Size")}</th>
            <th width={'14%'}>{gettext("Last Update")}
              <a className="table-sort-op by-time" href="#">{/*TODO: sort*/}<span className="sort-icon icon-caret-up"></span></a>
            </th>
            <th width="16%">{gettext("Owner")}</th>
          </tr>
        </thead>
        <tbody>
          {this.renderRepoListView()}
        </tbody>
      </table>
    );
  }

  renderMobileUI = () => {
    let isShowTableThread = this.props.isShowTableThread !== undefined ? this.props.isShowTableThread : true;
    return (
      <table>
        <thead className={isShowTableThread ? '' : 'vh'}>
          <tr>
            <th width="18%"><span className="sr-only">{gettext("Library Type")}</span></th>
            <th width="68%">
              {gettext("Sort:")} {/* TODO: sort */}
              {gettext("name")}<a className="table-sort-op mobile-table-sort-op by-name" href="#"> <span className="sort-icon icon-caret-down hide"></span></a>
              {gettext("last update")}<a className="table-sort-op mobile-table-sort-op by-time" href="#"> <span className="sort-icon icon-caret-up"></span></a>
            </th>
            <th width="14%"><span className="sr-only">{gettext("Actions")}</span></th>
          </tr>
        </thead>
        <tbody>
          {this.renderRepoListView()}
        </tbody>
      </table>
    );
  }

  render() {
    if (window.innerWidth >= 768) {
      return this.renderPCUI();
    } else {
      return this.renderMobileUI();
    }
  }
}

SharedRepoListView.propTypes = propTypes;

export default SharedRepoListView;
