import React, { useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import classnames from 'classnames';
import ModalPortal from '@/components/modal-portal';
import Icon from '@/components/icon';
import EventBus from '@/components/common/event-bus';
import { RenamePopover, OptionsPopover } from '@/metadata/components/popover';
import NumberFormatPopover from './number-format-popover';
import CustomDropdown from '@/components/dropdown';
import { gettext } from '@/utils/constants';
import { getDateDisplayString } from '@/metadata/utils/cell';
import { CellType, DEFAULT_DATE_FORMAT, SORT_COLUMN_OPTIONS, SHOW_DISABLED_SORT_COLUMNS, SORT_TYPE, EVENT_BUS_TYPE } from '@/metadata/constants';

import './index.css';

const HeaderDropdownMenu = forwardRef(({
  column,
  view,
  renameColumn,
  modifyColumnData,
  deleteColumn,
  canModifyView,
  canModifyColumnData,
  canDeleteColumn,
  canRenameColumn,
}, ref) => {
  const [isRenamePopoverShow, setRenamePopoverShow] = useState(false);
  const [isOptionPopoverShow, setOptionPopoverShow] = useState(false);
  const [isNumberFormatPopoverShow, setNumberFormatPopoverShow] = useState(false);

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

  const openOptionPopover = useCallback(() => {
    setOptionPopoverShow(true);
  }, []);

  const closeOptionPopover = useCallback(() => {
    setOptionPopoverShow(false);
  }, []);

  const openNumberFormatPopover = useCallback(() => {
    setNumberFormatPopoverShow(true);
  }, []);

  const closeNumberFormatPopover = useCallback(() => {
    setNumberFormatPopoverShow(false);
  }, []);

  const onUpdateOptions = useCallback((options, optionModifyType) => {
    const oldData = column.data || {};
    modifyColumnData(column.key, { options }, { options: oldData.options || [] }, { optionModifyType });
  }, [column, modifyColumnData]);

  const onChangeDateFormat = useCallback((event, newFormat) => {
    event && event.stopPropagation();
    const oldFormat = column.data ? column.data.format : '';
    if (oldFormat !== newFormat) {
      modifyColumnData(column.key, { format: newFormat }, { format: oldFormat });
    }
  }, [column, modifyColumnData]);

  const onUpdateNumberFormat = useCallback((newFormatData) => {
    const oldData = column.data || {};
    setNumberFormatPopoverShow(false);
    modifyColumnData(column.key, newFormatData, oldData);
  }, [column, modifyColumnData]);

  const onDelete = useCallback(() => {
    const { key, name, type, data = null } = column;
    EventBus.getInstance().dispatch(EVENT_BUS_TYPE.SELECT_NONE);
    deleteColumn(column.key, { key, name, type, data });
  }, [column, deleteColumn]);

  const openRenamePopover = useCallback((e) => {
    e && e.stopPropagation();
    setRenamePopoverShow(true);
  }, []);

  const closeRenamePopover = useCallback((e) => {
    e && e.stopPropagation();
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

  const modifySort = useCallback((type, event) => {
    if (!canModifyView) {
      event && event.stopPropagation();
      return;
    }
    const sorts = view.sorts.slice(0);
    const { key } = column;
    const sortIndex = sorts.findIndex(sort => sort.column_key === key);
    const sort = sorts[sortIndex];
    const newSort = { column_key: column.key, sort_type: type };
    const eventBus = EventBus.getInstance();
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
  }, [view, column, canModifyView]);

  useImperativeHandle(ref, () => ({
    isPopoverShow: () => {
      return isRenamePopoverShow || isOptionPopoverShow || isNumberFormatPopoverShow;
    },
  }), [isRenamePopoverShow, isOptionPopoverShow, isNumberFormatPopoverShow]);

  const getDateFormatItems = useCallback(() => {
    if (!canModifyColumnData || !canModifyColumnData(column)) return [];
    const { data = {} } = column;
    const { format = DEFAULT_DATE_FORMAT } = data;
    let timeUnit = format.split(' ')[1];
    return [
      { key: 'ISO', label: `${gettext('ISO')} (${getDateDisplayString(today, classnames('YYYY-MM-DD', timeUnit))})`, onClick: (event) => onChangeDateFormat(event, classnames('YYYY-MM-DD', timeUnit)) },
      { key: 'US', label: `${gettext('US')} (${getDateDisplayString(today, classnames('M/D/YYYY', timeUnit))})`, onClick: (event) => onChangeDateFormat(event, classnames('M/D/YYYY', timeUnit)) },
      { key: 'Europe', label: `${gettext('European')} (${getDateDisplayString(today, classnames('DD/MM/YYYY', timeUnit))})`, onClick: (event) => onChangeDateFormat(event, classnames('DD.MM.YYYY', timeUnit)) },
      { key: 'Germany', label: `${gettext('Germany Russia etc')} (${getDateDisplayString(today, classnames('DD.MM.YYYY', timeUnit))})`, onClick: (event) => onChangeDateFormat(event, classnames('DD.MM.YYYY', timeUnit)) },
    ];
  }, [today, column, onChangeDateFormat, canModifyColumnData]);

  const menuItems = useMemo(() => {
    const { type } = column;
    const canModifyColumnDataFn = canModifyColumnData ? canModifyColumnData(column) : false;
    const canDeleteColumnFn = canDeleteColumn ? canDeleteColumn(column) : false;
    const canRenameColumnFn = canRenameColumn ? canRenameColumn(column) : false;
    const canModifyViewFn = canModifyView ? canModifyView() : false;
    const hasAdvancedSection = [CellType.DATE, CellType.SINGLE_SELECT, CellType.MULTIPLE_SELECT, CellType.NUMBER].includes(type);
    const items = [];

    if (type === CellType.SINGLE_SELECT) {
      items.push({
        key: 'edit-single-select',
        label: gettext('Edit single select'),
        icon_dom: <Icon className="sf-metadata-icon" symbol="single-select" />,
        disabled: !canModifyColumnDataFn,
        onClick: openOptionPopover,
      });
    }

    if (type === CellType.MULTIPLE_SELECT) {
      items.push({
        key: 'edit-multiple-select',
        label: gettext('Edit multiple select'),
        icon_dom: <Icon className="sf-metadata-icon" symbol="multiple-select" />,
        disabled: !canModifyColumnDataFn,
        onClick: openOptionPopover,
      });
    }

    if (type === CellType.DATE) {
      const dateItems = getDateFormatItems();
      if (dateItems.length > 0) {
        items.push({
          key: 'date-format',
          label: gettext('Edit format settings'),
          icon_dom: <Icon className="sf-metadata-icon" symbol="set-up" />,
          children: dateItems,
        });
      }
    }

    if (type === CellType.NUMBER) {
      items.push({
        key: 'number-format',
        label: gettext('Edit format settings'),
        icon_dom: <Icon className="sf-metadata-icon" symbol="set-up" />,
        disabled: !canModifyColumnDataFn,
        onClick: openNumberFormatPopover,
      });
    }

    if (hasAdvancedSection) {
      items.push('Divider');
    }

    items.push({
      key: 'rename',
      label: gettext('Rename property'),
      icon_dom: <Icon className="sf-metadata-icon" symbol="rename" />,
      disabled: !canRenameColumnFn,
      onClick: openRenamePopover,
    });

    if (SORT_COLUMN_OPTIONS.includes(type) || SHOW_DISABLED_SORT_COLUMNS.includes(type)) {
      items.push({
        key: 'sort-ascending',
        label: gettext('Sort ascending'),
        icon_dom: <Icon className="sf-metadata-icon" symbol="sort-ascending" />,
        disabled: !canModifyViewFn || SHOW_DISABLED_SORT_COLUMNS.includes(type),
        onClick: () => modifySort(SORT_TYPE.UP),
      });
      items.push({
        key: 'sort-descending',
        label: gettext('Sort descending'),
        icon_dom: <Icon className="sf-metadata-icon" symbol="sort-descending" />,
        disabled: !canModifyViewFn || SHOW_DISABLED_SORT_COLUMNS.includes(type),
        onClick: () => modifySort(SORT_TYPE.DOWN),
      });
    }

    items.push({
      key: 'delete',
      label: gettext('Delete property'),
      icon_dom: <Icon className="sf-metadata-icon" symbol="delete" />,
      disabled: !canDeleteColumnFn,
      onClick: onDelete,
    });

    return items;
  }, [column, canModifyColumnData, canDeleteColumn, canRenameColumn, canModifyView, getDateFormatItems, openOptionPopover, openNumberFormatPopover, openRenamePopover, onDelete, modifySort]);

  return (
    <>
      <CustomDropdown
        items={menuItems}
        trigger={<Icon symbol="down" />}
        triggerClassName="sf-table-header-dropdown-toggle"
        menuClassName="sf-table-column-dropdown-menu"
      />
      {isRenamePopoverShow && (
        <ModalPortal>
          <RenamePopover
            target={`sf-table-column-${column.key}`}
            value={column.name}
            onToggle={closeRenamePopover}
            onSubmit={onRename}
          />
        </ModalPortal>
      )}
      {isOptionPopoverShow && (
        <ModalPortal>
          <OptionsPopover
            target={`sf-table-column-${column.key}`}
            column={column}
            onToggle={closeOptionPopover}
            onSubmit={onUpdateOptions}
          />
        </ModalPortal>
      )}
      {isNumberFormatPopoverShow && (
        <ModalPortal>
          <NumberFormatPopover
            target={`sf-table-column-${column.key}`}
            column={column}
            onToggle={closeNumberFormatPopover}
            onSubmit={onUpdateNumberFormat}
          />
        </ModalPortal>
      )}
    </>
  );
});

HeaderDropdownMenu.displayName = 'HeaderDropdownMenu';

export default HeaderDropdownMenu;
