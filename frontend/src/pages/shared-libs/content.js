import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import LibsMobileThead from '../../components/libs-mobile-thead';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import ContextMenu from '../../components/context-menu/context-menu';
import { hideMenu, handleContextClick } from '../../components/context-menu/actions';
import Item from './item';
import Icon from '../../components/icon';

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

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
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
    const { loading, errorMsg, items, sortBy, sortOrder, inAllLibs, currentViewMode } = this.props;

    const emptyTip = inAllLibs ?
      <p className={`libraries-empty-tip-in-${currentViewMode}-mode`}>{gettext('No shared libraries')}</p> :
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
      // sort
      const sortByName = sortBy == 'name';
      const sortByTime = sortBy == 'time';
      const sortBySize = sortBy == 'size';
      const sortIcon = <span className="d-flex justify-content-center align-items-center ml-1"><Icon symbol="down" className={`w-3 h-3 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} /></span>;

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
          <table className={classNames({ 'table-thead-hidden': inAllLibs })}>
            <thead>
              <tr>
                <th width="4%"></th>
                <th width="3%"><span className="sr-only">{gettext('Library Type')}</span></th>
                <th width="35%"><a className="d-flex align-items-center table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
                <th width="10%"><span className="sr-only">{gettext('Actions')}</span></th>
                <th width="14%"><a className="d-flex align-items-center table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBySize && sortIcon}</a></th>
                <th width="17%"><a className="d-flex align-items-center table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortByTime && sortIcon}</a></th>
                <th width="17%">{gettext('Owner')}</th>
              </tr>
            </thead>
            <tbody>
              {itemsContent}
            </tbody>
          </table>
        ) : (
          <div className="d-flex justify-content-between flex-wrap">
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
          <ContextMenu
            id="shared-libs-item-menu"
            onMenuItemClick={this.onMenuItemClick}
          />
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
