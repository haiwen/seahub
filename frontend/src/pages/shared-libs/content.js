import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import LibsMobileThead from '../../components/libs-mobile-thead';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import ContextMenu from '../../components/context-menu/context-menu';
import { hideMenu, handleContextClick } from '../../components/context-menu/actions';
import Item from './item';
import RepoListCard from '../../components/repo-list-card/repo-list-card';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
    this.libItems = [];
  }

  freezeItem = (freezed) => {
    this.setItemFreezed(freezed);
  };

  onFreezedItem = () => {
    this.setItemFreezed(true);
  };

  onUnfreezedItem = () => {
    this.setItemFreezed(false);
  };

  onContextMenu = (event, repo) => {
    event.preventDefault();
    const id = 'shared-libs-item-menu';
    const menuList = Utils.getSharedLibsOperationList(repo);
    handleContextClick(event, id, menuList, repo);
  };

  setItemFreezed = (isItemFreezed) => {
    if (this.props.onFreezedItem && this.props.onUnfreezedItem) {
      isItemFreezed ? this.props.onFreezedItem() : this.props.onUnfreezedItem();
      return;
    }
    this.setState({ isItemFreezed });
  };

  setLibItemRef = (index) => item => {
    this.libItems[index] = item;
  };

  getLibIndex = (lib) => {
    return this.props.items.findIndex(item => {
      return item.repo_id === lib.repo_id;
    });
  };

  onMenuItemClick = (operation, currentObject, event) => {
    const index = this.getLibIndex(currentObject);
    this.libItems[index].onMenuItemClick(operation, event);

    hideMenu();
  };

  render() {
    const { loading, errorMsg, items, inAllLibs, currentViewMode } = this.props;

    const emptyTip = inAllLibs ?
      <span className={`libraries-empty-tip-in-${currentViewMode}-mode`}>{gettext('No shared libraries')}</span> :
      <EmptyTip
        title={gettext('No shared libraries')}
        text={gettext('No libraries have been shared directly with you. A shared library can be shared with full or restricted permission. If you need access to a library owned by another user, ask the user to share the library with you.')}
      >
      </EmptyTip>;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const isDesktop = Utils.isDesktop();
      const itemsContent = (
        <>
          {items.map((item, index) => {
            return <Item
              idx={index}
              ref={this.setLibItemRef(index)}
              key={index}
              data={item}
              isDesktop={isDesktop}
              isItemFreezed={typeof this.props.isItemFreezed === 'boolean' ? this.props.isItemFreezed : this.state.isItemFreezed}
              freezeItem={this.freezeItem}
              onFreezedItem={this.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
              onToggleStarRepo={this.props.onToggleStarRepo}
              currentViewMode={currentViewMode}
              onContextMenu={this.onContextMenu}
            />;
          })}
        </>
      );

      let content;
      if (isDesktop) {
        content = currentViewMode == LIST_MODE ? (
          <>
            <RepoListCard>
              {itemsContent}
            </RepoListCard>
            <ContextMenu
              id="shared-libs-item-menu"
              onMenuItemClick={this.onMenuItemClick}
            />
          </>
        ) : (
          <div className="repo-grid-container">
            {itemsContent}
          </div>
        );
      } else {
        // mobile
        content = (
          <table className="table-thead-hidden">
            {<LibsMobileThead inAllLibs={inAllLibs} />}
            <tbody>
              {itemsContent}
            </tbody>
          </table>
        );
      }

      return items.length ? (
        <>
          {content}
        </>
      ) : emptyTip;
    }
  }
}

Content.propTypes = {
  currentViewMode: PropTypes.string,
  inAllLibs: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool,
  onFreezedItem: PropTypes.func,
  onUnfreezedItem: PropTypes.func,
  onToggleStarRepo: PropTypes.func.isRequired,
};

export default Content;
