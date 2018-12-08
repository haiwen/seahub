import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import RepoListItem from './repo-list-item';

const propTypes = {
  isShowRepoOwner: PropTypes.bool.isRequired,
  repoList: PropTypes.array.isRequired,
};

class RepoListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
  }

  renderPCUI = () => {
    return (
      <table>
        <thead>
          <tr>
            <th width="4%"><span className="sr-only">{gettext("Library Type")}</span></th>
            <th width="38%">{gettext("Name")}
              <a className="table-sort-op by-name" href="#">{/*TODO: sort*/}<span className="sort-icon icon-caret-down hide"></span></a>
            </th>
            <th width="10%"><span className="sr-only">{gettext("Actions")}</span></th>
            <th width="14%">{gettext("Size")}</th>
            <th width="18%">{gettext("Last Update")}
              <a className="table-sort-op by-time" href="#">{/*TODO: sort*/}<span className="sort-icon icon-caret-up"></span></a>
            </th>
            <th width="16%">{gettext("Owner")}</th>
          </tr>
        </thead>
        <tbody>
          {this.props.repoList.map(repo => {
            return (
              <RepoListItem
                key={repo.repo_id}
                repo={repo}
                isShowRepoOwner={this.props.isShowRepoOwner}
                isItemFreezed={this.state.isItemFreezed}
                currentGroup={this.props.currentGroup}
              />
            );
          })}
        </tbody>
      </table>
    );
  }

  renderMobileUI = () => {
    return (
      <table>
        <thead>
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
          {this.props.repoList.map(repo => {
            return (
              <RepoListItem
                key={repo.repo_id}
                repo={repo}
                isShowRepoOwner={this.props.isShowRepoOwner}
                isItemFreezed={this.state.isItemFreezed}
                currentGroup={this.props.currentGroup}
              />
            );
          })}
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

RepoListView.propTypes = propTypes;

export default RepoListView;
