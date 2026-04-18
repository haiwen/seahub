import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
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
    this.setState({
      isItemFreezed: freezed
    });
  };

  onContextMenu = (event, repo) => {
    event.preventDefault();
    const id = 'shared-libs-item-menu';
    const menuList = Utils.getSharedLibsOperationList(repo);
    handleContextClick(event, id, menuList, repo);
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
              ref={this.setLibItemRef(index)}
              key={index}
              data={item}
              isDesktop={isDesktop}
              isItemFreezed={this.state.isItemFreezed}
              freezeItem={this.freezeItem}
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
          <>
            <RepoListCard>
              {itemsContent}
            </RepoListCard>
          </>
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
};

export default Content;
