import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import MylibRepoListItem from './mylib-repo-list-item';
import LibsMobileThead from '../../components/libs-mobile-thead';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import ContextMenu from '../../components/context-menu/context-menu';
import { Utils } from '../../utils/utils';
import { hideMenu, handleContextClick } from '../../components/context-menu/actions';
import RepoListCard from '../../components/repo-list-card/repo-list-card';

const propTypes = {
  repoList: PropTypes.array.isRequired,
  onRenameRepo: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  onTransferRepo: PropTypes.func.isRequired,
  onToggleStarRepo: PropTypes.func.isRequired,
  currentViewMode: PropTypes.string,
  updateRepoStatus: PropTypes.func,
  isItemFreezed: PropTypes.bool,
  onFreezedItem: PropTypes.func,
  onUnfreezedItem: PropTypes.func,
};

class MylibRepoListView extends React.Component {

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

  onMenuItemClick = (operation, currentObject, event) => {
    const index = this.getRepoIndex(currentObject);
    if (this.repoItems[index]) {
      this.repoItems[index].onMenuItemClick(event, operation);
    }

    hideMenu();
  };

  renderRepoListView = () => {
    return (
      <Fragment>
        {this.props.repoList.map((item, index) => {
          return (
            <MylibRepoListItem
              ref={this.setRepoItemRef(index)}
              idx={index}
              key={item.repo_id}
              repo={item}
              isItemFreezed={this.getIsItemFreezed()}
              onFreezedItem={this.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
              onRenameRepo={this.props.onRenameRepo}
              onDeleteRepo={this.props.onDeleteRepo}
              onTransferRepo={this.props.onTransferRepo}
              onToggleStarRepo={this.props.onToggleStarRepo}
              currentViewMode={this.props.currentViewMode}
              onContextMenu={this.onContextMenu}
              updateRepoStatus={this.props.updateRepoStatus}
            />
          );
        })}
      </Fragment>
    );
  };

  renderPCUI = () => {
    const { currentViewMode = LIST_MODE } = this.props;

    if (currentViewMode === LIST_MODE) {
      return (
        <>
          <RepoListCard>
            {this.renderRepoListView()}
          </RepoListCard>
          <ContextMenu
            id="mylib-repo-item-menu"
            onMenuItemClick={this.onMenuItemClick}
          />
        </>
      );
    }

    return (
      <>
        <div className="repo-grid-container">
          {this.renderRepoListView()}
        </div>
        <ContextMenu
          id="mylib-repo-item-menu"
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
