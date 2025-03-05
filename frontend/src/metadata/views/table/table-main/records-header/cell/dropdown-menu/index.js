import React, { createRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem as DefaultDropdownItem } from 'reactstrap';
import classnames from 'classnames';
import ModalPortal from '../../../../../../../components/modal-portal';
import Icon from '../../../../../../../components/icon';
import { RenamePopover, OptionsPopover } from '../../../../../../components/popover';
import DropdownItem from './dropdown-item';
import { gettext } from '../../../../../../../utils/constants';
import { isMobile } from '../../../../../../../utils/utils';
import { checkIsPrivateColumn } from '../../../../../../utils/column';
import { getDateDisplayString } from '../../../../../../utils/cell';
import { CellType, DEFAULT_DATE_FORMAT, SORT_COLUMN_OPTIONS, SHOW_DISABLED_SORT_COLUMNS, SORT_TYPE, EVENT_BUS_TYPE } from '../../../../../../constants';

import './index.css';

const HeaderDropdownMenu = forwardRef(({ column, view, renameColumn, modifyColumnData, deleteColumn }, ref) => {
  const menuRef = createRef();
  const dropdownDomRef = createRef();
  const [isMenuShow, setMenuShow] = useState(false);
  const [isSubMenuShow, setSubMenuShow] = useState(false);
  const [isRenamePopoverShow, setRenamePopoverShow] = useState(false);
  const [isOptionPopoverShow, setOptionPopoverShow] = useState(false);

  const isPrivateColumn = useMemo(() => {
    return checkIsPrivateColumn(column);
  }, [column]);

  const today = useMemo(() => {
    let todayDate = new Date();
    let year = todayDate.getFullYear();
    let month = todayDate.getMonth() + 1;
    let date = todayDate.getDate();
    let hour = todayDate.getHours();
    let minute = todayDate.getMinutes();
    month = month > 9 ? month : `0${month}`;
    date = date > 9 ? date : `0${date}`;
    hour = hour > 9 ? hour : `0${hour}`;
    minute = minute > 9 ? minute : `0${minute}`;
    return `${year}-${month}-${date} ${hour}:${minute}`;
  }, []);

  const onToggle = useCallback((event) => {
    event && event.preventDefault();
    event && event.stopPropagation();
    const targetDom = event.target;
    if (targetDom.className === 'string' && targetDom.className.includes('disabled')) return;
    setMenuShow(!isMenuShow);
  }, [isMenuShow]);

  const openSubMenu = useCallback(() => {
    setSubMenuShow(true);
  }, []);

  const hideSubMenu = useCallback(() => {
    setSubMenuShow(false);
  }, []);

  const openOptionPopover = useCallback(() => {
    setOptionPopoverShow(true);
  }, []);

  const closeOptionPopover = useCallback(() => {
    setOptionPopoverShow(false);
  }, []);

  const onUpdateOptions = useCallback((options, optionModifyType) => {
    const oldData = column.data || {};
    setMenuShow(false);
    modifyColumnData(column.key, { options }, { options: oldData.options || [] }, { optionModifyType });
  }, [column, modifyColumnData]);

  // const toggleDefineCascade = useCallback(() => {

  // }, []);

  const onChangeDateFormat = useCallback((event, newFormat) => {
    event && event.stopPropagation();
    const oldFormat = column.data ? column.data.format : '';
    setSubMenuShow(false);
    setMenuShow(false);
    if (oldFormat !== newFormat) {
      modifyColumnData(column.key, { format: newFormat }, { format: oldFormat });
    }
  }, [column, modifyColumnData]);

  const onDelete = useCallback(() => {
    deleteColumn(column.key, column);
  }, [column, deleteColumn]);

  const openRenamePopover = useCallback(() => {
    setRenamePopoverShow(true);
  }, []);

  const closeRenamePopover = useCallback(() => {
    setRenamePopoverShow(false);
  }, []);

  const onRename = useCallback((value) => {
    if (value === column.name) {
      setRenamePopoverShow(false);
      return;
    }
    renameColumn(column.key, value, column.name);
    setRenamePopoverShow(false);
  }, [column, renameColumn]);

  const renderDateFormat = useCallback((canModifyColumnData) => {
    const { data = {} } = column;
    if (!canModifyColumnData) {
      return (
        <DropdownItem
          disabled={true}
          target="sf-metadata-edit-column-format"
          title={gettext('Edit format settings')}
          tip={isPrivateColumn ? gettext('This property is not editable') : gettext('You do not have permission')}
          iconName="set-up"
        />
      );
    }
    const { format = DEFAULT_DATE_FORMAT } = data;
    let timeUnit = format.split(' ')[1];

    const options = [
      { label: `${gettext('ISO')} (${getDateDisplayString(today, classnames('YYYY-MM-DD', timeUnit))})`, value: classnames('YYYY-MM-DD', timeUnit) },
      { label: `${gettext('US')} (${getDateDisplayString(today, classnames('M/D/YYYY', timeUnit))})`, value: classnames('M/D/YYYY', timeUnit) },
      { label: `${gettext('European')} (${getDateDisplayString(today, classnames('DD/MM/YYYY', timeUnit))})`, value: classnames('DD/MM/YYYY', timeUnit) },
      { label: `${gettext('Germany Russia etc')} (${getDateDisplayString(today, classnames('DD.MM.YYYY', timeUnit))})`, value: classnames('DD.MM.YYYY', timeUnit) }
    ];

    return (
      <Dropdown className="sf-metadata-dropdown-menu w-100" isOpen={isSubMenuShow} direction="right">
        <DropdownToggle
          tag="span"
          role="button"
          data-toggle="dropdown"
          aria-expanded={isMenuShow}
          className="dropdown-item sf-metadata-column-dropdown-item d-flex align-items-center"
          onMouseOver={openSubMenu}
          disabled
          caret
        >
          <Icon symbol="set-up" />
          <span className="item-text">{gettext('Edit format settings')}</span>
        </DropdownToggle>
        <DropdownMenu style={{ marginLeft: '-16px', transform: 'none' }}>
          {options.map(option => {
            return (
              <DefaultDropdownItem
                className="sf-metadata-column-dropdown-item"
                toggle={false}
                key={option.value}
                onClick={(event) => onChangeDateFormat(event, option.value)}
              >
                {<span>{option.label}</span>}
              </DefaultDropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }, [today, column, isMenuShow, isSubMenuShow, onChangeDateFormat, openSubMenu, isPrivateColumn]);

  const modifySort = useCallback((type, event) => {
    const canModifyView = window.sfMetadataContext.canModifyView();
    if (!canModifyView) {
      event.stopPropagation();
      return;
    }
    const sorts = view.sorts.slice(0);
    const { key } = column;
    const sortIndex = sorts.findIndex(sort => sort.column_key === key);
    const sort = sorts[sortIndex];
    const newSort = { column_key: column.key, sort_type: type };
    const eventBus = window.sfMetadataContext.eventBus;
    if (!sort) {
      sorts.push(newSort);
      eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_SORTS, sorts, true);
      return;
    }
    if (sort && sort.sort_type !== type) {
      sorts.splice(sortIndex, 1, newSort);
      eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_SORTS, sorts, true);
      return;
    }
    eventBus.dispatch(EVENT_BUS_TYPE.DISPLAY_SORTS);
  }, [view, column]);

  useImperativeHandle(ref, () => ({
    isPopoverShow: () => {
      return isRenamePopoverShow || isOptionPopoverShow;
    },
  }), [isRenamePopoverShow, isOptionPopoverShow]);

  const renderDropdownMenu = useCallback(() => {
    const { type } = column;
    const canModifyColumnData = window.sfMetadataContext.canModifyColumnData(column);
    const canDeleteColumn = window.sfMetadataContext.canDeleteColumn(column);
    const canRenameColumn = window.sfMetadataContext.canRenameColumn(column);
    const canModifyView = window.sfMetadataContext.canModifyView();

    return (
      <DropdownMenu ref={menuRef} className="sf-metadata-column-dropdown-menu">
        <div ref={dropdownDomRef}>
          {type === CellType.SINGLE_SELECT && (
            <>
              <DropdownItem
                disabled={!canModifyColumnData}
                target="sf-metadata-edit-column-options"
                iconName="single-select"
                title={gettext('Edit single select')}
                tip={isPrivateColumn ? gettext('This property is not editable') : gettext('You do not have permission')}
                onChange={openOptionPopover}
              />
              {/* <DropdownItem
                disabled={!canModifyColumnData}
                target="sf-metadata-edit-column-define-cascade"
                iconName="linkage"
                title={gettext('Define cascade')}
                tip={gettext('You do not have permission')}
                onChange={toggleDefineCascade}
              /> */}
            </>
          )}
          {type === CellType.MULTIPLE_SELECT && (
            <DropdownItem
              disabled={!canModifyColumnData}
              target="sf-metadata-edit-column-options"
              iconName="multiple-select"
              title={gettext('Edit multiple select')}
              tip={isPrivateColumn ? gettext('This property is not editable') : gettext('You do not have permission')}
              onChange={openOptionPopover}
            />
          )}
          {/* {type === CellType.NUMBER && (
            TODO:
            <DropdownItem
              disabled={!canModifyColumnData}
              target="sf-metadata-edit-column-format"
              iconName="set-up"
              title={gettext('Edit format settings')}
              onChange={() => {}}
            />
          )} */}
          {type === CellType.DATE && (
            <>{renderDateFormat(canModifyColumnData)}</>
          )}
          {[CellType.DATE, CellType.SINGLE_SELECT, CellType.MULTIPLE_SELECT].includes(column.type) && (
            <DefaultDropdownItem key="divider-item" divider />
          )}
          <DropdownItem
            disabled={!canRenameColumn}
            target="sf-metadata-rename-column"
            iconName="rename"
            title={gettext('Rename property')}
            tip={isPrivateColumn ? gettext('This property is not editable') : gettext('You do not have permission')}
            onChange={openRenamePopover}
            onMouseEnter={hideSubMenu}
          />
          {(SORT_COLUMN_OPTIONS.includes(column.type) || SHOW_DISABLED_SORT_COLUMNS.includes(column.type)) && (
            <>
              <DropdownItem
                disabled={!canModifyView || SHOW_DISABLED_SORT_COLUMNS.includes(column.type)}
                target="sf-metadata-sort-ascending-column"
                iconName="sort-ascending"
                title={gettext('Sort ascending')}
                tip={!canModifyView ? gettext('You do not have permission') : gettext('This property does not support sorting')}
                onChange={() => modifySort(SORT_TYPE.UP)}
                onMouseEnter={hideSubMenu}
              />
              <DropdownItem
                disabled={!canModifyView || SHOW_DISABLED_SORT_COLUMNS.includes(column.type)}
                target="sf-metadata-sort-descending-column"
                iconName="sort-descending"
                title={gettext('Sort descending')}
                tip={!canModifyView ? gettext('You do not have permission') : gettext('This property does not support sorting')}
                onChange={() => modifySort(SORT_TYPE.DOWN)}
                onMouseEnter={hideSubMenu}
              />
            </>
          )}
          <DropdownItem
            disabled={!canDeleteColumn}
            target="sf-metadata-delete-column"
            iconName="delete"
            title={gettext('Delete property')}
            tip={isPrivateColumn ? gettext('This property can not be deleted') : gettext('You do not have permission')}
            onChange={onDelete}
            onMouseEnter={hideSubMenu}
          />
        </div>
      </DropdownMenu>
    );
  }, [column, openRenamePopover, hideSubMenu, renderDateFormat, openOptionPopover, menuRef, dropdownDomRef, modifySort, onDelete, isPrivateColumn]);

  return (
    <>
      <Dropdown className="sf-metadata-dropdown-menu" isOpen={isMenuShow} toggle={onToggle}>
        <DropdownToggle
          tag="span"
          role="button"
          data-toggle="dropdown"
          aria-expanded={isMenuShow}
          title={gettext('More operations')}
          aria-label={gettext('More operations')}
          tabIndex={0}
        >
          <i className='sf3-font sf3-font-down' aria-hidden="true"></i>
        </DropdownToggle>
        {isMenuShow && !isMobile &&
          <ModalPortal>
            <div className="sf-metadata-dropdown-menu large">{renderDropdownMenu()}</div>
          </ModalPortal>
        }
      </Dropdown>
      {isRenamePopoverShow && (
        <ModalPortal>
          <RenamePopover
            target={`sf-metadata-column-${column.key}`}
            value={column.name}
            onToggle={closeRenamePopover}
            onSubmit={onRename}
          />
        </ModalPortal>
      )}
      {isOptionPopoverShow && (
        <ModalPortal>
          <OptionsPopover
            target={`sf-metadata-column-${column.key}`}
            column={column}
            onToggle={closeOptionPopover}
            onSubmit={onUpdateOptions}
          />
        </ModalPortal>
      )}
    </>
  );
});

HeaderDropdownMenu.propTypes = {
  column: PropTypes.object,
  renameColumn: PropTypes.func,
  modifyColumnData: PropTypes.func,
  deleteColumn: PropTypes.func,
};

export default HeaderDropdownMenu;
