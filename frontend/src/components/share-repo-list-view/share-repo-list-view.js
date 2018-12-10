import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import ShareRepoListItem from './share-repo-list-item';

const propTypes = {
  currentGroup: PropTypes.object,
  repoList: PropTypes.array.isRequired,
  isShowTableThread: PropTypes.bool,
  onItemUnshared: PropTypes.func.isRequired,
};

class ShareRepoListView extends React.Component {

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
            <ShareRepoListItem
              key={repo.repo_id}
              repo={repo}
              currentGroup={this.props.currentGroup}
              isItemFreezed={this.state.isItemFreezed}
              onFreezedItem={this.onFreezedItem}
              onItemUnshared={this.props.onItemUnshared}
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
        <thead className={isShowTableThread ? '' : 'vh'}>
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
              <Fragment>
                {gettext("Sort:")} {/* TODO: sort */}
                {gettext("name")}<a className="table-sort-op mobile-table-sort-op by-name" href="#"> <span className="sort-icon icon-caret-down hide"></span></a>
                {gettext("last update")}<a className="table-sort-op mobile-table-sort-op by-time" href="#"> <span className="sort-icon icon-caret-up"></span></a>
              </Fragment>
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

ShareRepoListView.propTypes = propTypes;

export default ShareRepoListView;
