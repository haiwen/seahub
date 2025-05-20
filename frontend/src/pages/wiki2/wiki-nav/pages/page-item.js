import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import NameEditPopover from '../../common/name-edit-popover';
import NavItemIcon from '../../common/nav-item-icon';
import PageDropdownMenu from './page-dropdownmenu';
import { gettext, wikiId, wikiPermission } from '../../../../utils/constants';
import AddNewPageDialog from '../add-new-page-dialog';
import Icon from '../../../../components/icon';
import CustomIcon from '../../custom-icon';
import { eventBus } from '../../../../components/common/event-bus';
import { INSERT_POSITION } from '../constants';
import toaster from '../../../../components/toast';
import wikiAPI from '../../../../utils/wiki-api';
import { Utils } from '../../../../utils/utils';

const PageItem = ({
  page,
  pageIndex,
  pages,
  pagesLength,
  parentPageId,
  duplicatePage,
  setCurrentPage,
  onUpdatePage,
  onDeletePage,
  onMovePage,
  isOnlyOnePage,
  pathStr,
  toggleExpand,
  getCurrentPageId,
  addSiblingPage,
  addPageInside,
  getFoldState,
  updateWikiConfig,
  getClassName,
  setClassName,
}) => {
  const [isShowNameEditor, setIsShowNameEditor] = useState(false);
  const [isShowOperationDropdown, setIsShowOperationDropdown] = useState(false);
  const [isShowInsertPage, setIsShowInsertPage] = useState(false);
  const [isShowAddSiblingPage, setIsShowAddSiblingPage] = useState(false);
  const [insertPosition, setInsertPosition] = useState('');
  const [dropPosition, setDropPosition] = useState(null);
  const [pageName, setPageName] = useState(page.name || '');
  const [isSelected, setIsSelected] = useState(page.id === getCurrentPageId());
  const [isMouseEntered, setIsMouseEntered] = useState(false);

  const ref = useRef(null);

  const [, drag] = useDrag(() => ({
    type: 'wiki-page',
    item: () => ({
      idx: pageIndex,
      data: { ...page, index: pageIndex },
    }),
  }));

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'wiki-page',
    hover: (item, monitor) => {
      if (!ref.current) return;
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const height = hoverBoundingRect.bottom - hoverBoundingRect.top;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      if (hoverClientY < 10) {
        setDropPosition('top');
        item.dropPosition = 'move_above';
      } else if (hoverClientY > height - 10) {
        setDropPosition('bottom');
        item.dropPosition = 'move_below';
      } else {
        setDropPosition(null);
        item.dropPosition = 'move_into';
      }
    },
    drop: (item, monitor) => {
      const target = page;
      const source = item.data;
      const moved_page_id = source.id;
      const target_page_id = target.id;

      if (moved_page_id === target_page_id) return;

      if (target._path && target._path.includes(moved_page_id)) {
        toaster.danger(gettext('Cannot move parent page to child page'));
        return;
      }

      const move_position = item.dropPosition || 'move_into';
      wikiAPI.moveWiki2Page(wikiId, moved_page_id, target_page_id, move_position).then(res => {
        onMovePage({ moved_page_id, target_page_id, move_position });
        setDropPosition(null);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }));

  drag(drop(ref));

  const onMouseEnter = () => {
    setIsMouseEntered(true);
  };

  const onMouseMove = () => {
    if (!isMouseEntered) {
      setIsMouseEntered(true);
    }
  };

  const onMouseLeave = () => {
    setIsMouseEntered(false);
  };

  const onClickPageItem = () => {
    if (!isShowNameEditor) {
      setCurrentPage(page.id);
    }
  };

  const savePageProperties = useCallback(() => {
    const { name, id } = page;
    const currentPageName = pageName.trim();
    if (currentPageName !== name) {
      const isUpdateBySide = true;
      onUpdatePage(id, { name: currentPageName }, isUpdateBySide);
    }
  }, [page, pageName, onUpdatePage]);

  const toggleNameEditor = useCallback((e) => {
    if (e) {
      e.stopPropagation();
    }
    setIsShowNameEditor(!isShowNameEditor);
  }, [isShowNameEditor]);

  const changeItemFreeze = (isFreeze) => {
    if (isFreeze) {
      ref.current.classList.add('wiki-page-freezed');
    } else {
      ref.current.classList.remove('wiki-page-freezed');
    }
  };

  const toggleDropdown = useCallback(() => {
    const isShow = !isShowOperationDropdown;
    setIsShowOperationDropdown(isShow);
    changeItemFreeze(isShow);
  }, [isShowOperationDropdown]);

  const toggleInsertSiblingPage = useCallback((position) => {
    let insertPosition = null;
    if (position === INSERT_POSITION.BELOW || position === INSERT_POSITION.ABOVE) {
      insertPosition = position;
    }
    setInsertPosition(insertPosition);
    setIsShowAddSiblingPage(!isShowAddSiblingPage);
  }, [isShowAddSiblingPage]);

  const toggleInsertPage = useCallback(() => {
    setIsShowInsertPage(!isShowInsertPage);
  }, [isShowInsertPage]);

  const onAddNewPage = useCallback((newPage) => {
    const folded = getFoldState(page.id);
    if (folded) {
      toggleExpand(page.id);
    }
    addPageInside(Object.assign({ parentPageId: page.id }, newPage));
  }, [page, addPageInside, getFoldState, toggleExpand]);

  const onAddSiblingPage = useCallback((newPage) => {
    addSiblingPage(newPage, parentPageId, insertPosition, page.id, toggleInsertSiblingPage);
  }, [page, parentPageId, addSiblingPage, insertPosition, toggleInsertSiblingPage]);

  const updateSelected = useCallback(() => {
    const isCurrentSelected = getCurrentPageId() === page.id;
    if (isSelected !== isCurrentSelected) {
      setIsSelected(isCurrentSelected);
    }
  }, [page, isSelected, getCurrentPageId]);

  useEffect(() => {
    const unsubscribeUpdateCurrentPage = eventBus.subscribe('update-wiki-current-page', updateSelected);

    return () => {
      unsubscribeUpdateCurrentPage();
    };
  }, [updateSelected]);

  useEffect(() => {
    if (!isShowNameEditor) {
      savePageProperties();
    }
  }, [isShowNameEditor, savePageProperties]);

  const renderPage = (page, index, pagesLength, isOnlyOnePage) => {
    if (!page) return;
    if (!pages.find(item => item.id === page.id)) return;
    return (
      <PageItem
        key={page.id}
        page={Object.assign({}, pages.find(item => item.id === page.id), page)}
        pageIndex={index}
        pages={pages}
        pagesLength={pagesLength}
        parentPageId={page.id}
        isOblyOnePage={isOnlyOnePage}
        duplicatePage={duplicatePage}
        setCurrentPage={setCurrentPage}
        onUpdatePage={onUpdatePage}
        onDeletePage={onDeletePage}
        onMovePage={onMovePage}
        updateWikiConfig={updateWikiConfig}
        pathStr={pathStr + '-' + page.id}
        getCurrentPageId={getCurrentPageId}
        addPageInside={addPageInside}
        addSiblingPage={addSiblingPage}
        getFoldState={getFoldState}
        toggleExpand={toggleExpand}
        setClassName={setClassName}
        getClassName={getClassName}
      />
    );
  };

  const childNumber = Array.isArray(page.children) ? page.children.length : 0;
  const customIcon = page.icon;
  const navItemId = `page-editor-${page.id}`;
  const pageChildrenStyle = getFoldState(page.id) ? {
    height: 0, overflowY: 'hidden'
  } : {
    height: 'auto', overflowY: 'visible'
  };

  if (wikiPermission === 'rw') {
    return (
      <>
        <div
          id={navItemId}
          ref={ref}
          className={classnames('wiki-page-item', {
            'selected-page': isSelected,
            'dragged-page-over': isOver && canDrop && !dropPosition,
            'page-can-drop-top': isOver && canDrop && dropPosition === 'top',
            'page-can-drop-bottom': isOver && canDrop && dropPosition === 'bottom',
          })}
          onMouseEnter={onMouseEnter}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
        >
          <div className="wiki-page-item-main" onClick={onClickPageItem}>
            <div
              className="wiki-page-content"
              style={pathStr ? {
                marginLeft: (pathStr.split('-').length - 1) * 24
              } : {}}
            >
              {childNumber === 0 && (customIcon ? (
                <CustomIcon icon={customIcon} />
              ) : (
                <NavItemIcon symbol={'file'} disable={true} />
              ))}
              {(!isMouseEntered && childNumber > 0) && (customIcon ? (
                <CustomIcon icon={customIcon} />
              ) : (
                <NavItemIcon symbol={'file'} disable={true} />
              ))}
              {(isMouseEntered && childNumber > 0) && (
                <div role="button" className="nav-item-icon" onClick={() => toggleExpand(page.id)}>
                  <i className={`sf3-font-down sf3-font ${getFoldState(page.id) ? 'rotate-270' : ''}`} aria-hidden="true"></i>
                </div>
              )}
              <span className="wiki-page-title text-truncate" title={page.name}>{page.name}</span>
              {isShowNameEditor && (
                <NameEditPopover
                  oldName={pageName}
                  targetId={navItemId}
                  onChangeName={setPageName}
                  toggleEditor={toggleNameEditor}
                />
              )}
            </div>
          </div>
          <div className="d-none d-md-flex">
            <div className="more-wiki-page-operation" onClick={toggleDropdown}>
              <Icon symbol="more-level" />
              {isShowOperationDropdown && (
                <PageDropdownMenu
                  page={page}
                  pages={pages}
                  pagesLength={pagesLength}
                  isOnlyOnePage={isOnlyOnePage}
                  toggle={toggleDropdown}
                  toggleNameEditor={toggleNameEditor}
                  duplicatePage={duplicatePage}
                  onDeletePage={() => onDeletePage(page.id)}
                  toggleInsertSiblingPage={toggleInsertSiblingPage}
                />
              )}
            </div>
            <div className="wiki-add-page-btn" onClick={toggleInsertPage} role='button'>
              <span className='sf3-font sf3-font-enlarge' aria-hidden="true"></span>
            </div>
          </div>
          {isShowInsertPage && (
            <AddNewPageDialog
              toggle={toggleInsertPage}
              onAddNewPage={onAddNewPage}
              title={gettext('Add page inside')}
              page={page}
            />
          )}
          {isShowAddSiblingPage && (
            <AddNewPageDialog
              toggle={toggleInsertSiblingPage}
              onAddNewPage={onAddSiblingPage}
              title={gettext('Add page')}
              insertPosition={insertPosition}
              page={page}
            />
          )}
        </div>
        <div
          className="page-children"
          style={pageChildrenStyle}
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
        >
          {page.children && page.children.map((item, index) => renderPage(item, index, pagesLength, isOnlyOnePage))}
        </div>
      </>
    );
  }

  return (
    <>
      <div
        id={navItemId}
        ref={ref}
        className={classnames('wiki-page-item readonly', {
          'selected-page': isSelected,
          'dragged-page-over': isOver && canDrop,
          'page-can-drop-top': isOver && canDrop && dropPosition === 'top',
          'page-can-drop-bottom': isOver && canDrop && dropPosition === 'bottom',
        })}
        onMouseEnter={onMouseEnter}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <div className="wiki-page-item-main" onClick={onClickPageItem}>
          <div
            className="wiki-page-content"
            style={pathStr ? {
              marginLeft: (pathStr.split('-').length - 1) * 24,
            } : {}}
          >
            {childNumber === 0 && (customIcon ? (
              <CustomIcon icon={customIcon} />
            ) : (
              <NavItemIcon symbol="file" disable={true} />
            ))}
            {(!isMouseEntered && childNumber > 0) && (customIcon ? (
              <CustomIcon icon={customIcon} />
            ) : (
              <NavItemIcon symbol="files" disable={true} />
            ))}
            {(isMouseEntered && childNumber > 0) && (
              <div role="button" className="nav-item-icon" onClick={() => toggleExpand(page.id)}>
                <i className={`sf3-font-down sf3-font ${getFoldState(page.id) ? 'rotate-270' : ''}`} aria-hidden="true"></i>
              </div>
            )}
            <span className="wiki-page-title text-truncate">{page.name}</span>
          </div>
        </div>
        <div className="d-none d-md-flex"></div>
      </div>
      <div
        className="page-children"
        style={pageChildrenStyle}
        onClick={(e) => {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
      >
        {page.children && page.children.map((item, index) => renderPage(item, index, pagesLength, isOnlyOnePage))}
      </div>
    </>
  );
};

PageItem.propTypes = {
  page: PropTypes.object,
  pages: PropTypes.array,
  pageIndex: PropTypes.number,
  pagesLength: PropTypes.number,
  parentPageId: PropTypes.string,
  addSiblingPage: PropTypes.func,
  duplicatePage: PropTypes.func,
  setCurrentPage: PropTypes.func,
  onUpdatePage: PropTypes.func,
  onDeletePage: PropTypes.func,
  onMovePage: PropTypes.func,
  isOnlyOnePage: PropTypes.bool,
  pathStr: PropTypes.string,
  getCurrentPageId: PropTypes.func,
  addPageInside: PropTypes.func,
  getFoldState: PropTypes.func,
  toggleExpand: PropTypes.func,
  updateWikiConfig: PropTypes.func,
  getClassName: PropTypes.func,
  setClassName: PropTypes.func,
};

export default PageItem;
