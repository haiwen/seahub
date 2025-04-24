import React, { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useDrag, useDrop } from 'react-dnd';
import CustomizeSelect from '../../../../../components/customize-select';
import Icon from '../../../../../components/icon';
import { gettext } from '../../../../../utils/constants';
import { getColumnByKey } from '../../../../utils/column';
import { COLUMNS_ICON_CONFIG, SORT_TYPE, SORT_COLUMN_OPTIONS } from '../../../../constants';
import { getGroupbyGranularityByColumn, isShowGroupCountType, getSelectedCountType, getDefaultCountType } from '../../../../utils/group';

/*
  groupby: {
    column_key: 'xxx',
    count_type: 'xxx, // date/geolocation used
    sort_type: 'xxx',
  }
*/
const GroupbyItem = ({ showDragBtn, index, readOnly, groupby, columns, onDelete, onUpdate, onMove }) => {
  const ref = useRef(null);

  const [dropPosition, setDropPosition] = useState(null);

  const [, drag, preview] = useDrag({
    type: 'sfMetadataGroupbyItem',
    item: () => ({
      idx: index,
      data: groupby,
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'sfMetadataGroupbyItem',
    hover: (item, monitor) => {
      if (!ref.current) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      const newPosition = hoverClientY < hoverMiddleY ? 'top' : 'bottom';
      setDropPosition(newPosition);
    },
    drop: (item) => {
      if (item.idx === index) return;
      if (item.idx === index - 1 && dropPosition === 'top') return;
      if (item.idx === index + 1 && dropPosition === 'bottom') return;
      onMove(item, { idx: index, data: groupby });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    })
  });

  drop(preview(ref));

  const column = useMemo(() => {
    return getColumnByKey(columns, groupby.column_key);
  }, [groupby, columns]);

  const columnsOptions = useMemo(() => {
    if (!Array.isArray(columns) || columns.length === 0) return [];
    return columns.map(column => {
      const { type, name } = column;
      return {
        value: { column },
        label: (
          <Fragment>
            <span className="sf-metadata-filter-header-icon"><Icon className="sf-metadata-icon" symbol={COLUMNS_ICON_CONFIG[type]} /></span>
            <span className="select-option-name">{name}</span>
          </Fragment>
        )
      };
    });
  }, [columns]);

  const selectedColumn = useMemo(() => {
    return columnsOptions.find(option => option.value.column.key === groupby.column_key);
  }, [columnsOptions, groupby]);

  const sortOptions = useMemo(() => {
    return [
      {
        value: { sortType: SORT_TYPE.UP },
        label: <span className="select-option-name">{gettext('Up')}</span>
      }, {
        value: { sortType: SORT_TYPE.DOWN },
        label: <span className="select-option-name">{gettext('Down')}</span>
      }
    ];
  }, []);

  const selectedSortType = useMemo(() => {
    return sortOptions.find(option => option.value.sortType === groupby.sort_type);
  }, [sortOptions, groupby]);

  const DISPLAY_GROUP_DATE_GRANULARITY_TEXT = useMemo(() => {
    return {
      'By day': gettext('By day'),
      'By week': gettext('By week'),
      'By month': gettext('By month'),
      'By quarter': gettext('By quarter'),
      'By year': gettext('By year'),
    };
  }, []);

  const countTypeOptions = useMemo(() => {
    const column = getColumnByKey(columns, groupby.column_key);
    const { granularityList, displayGranularity } = getGroupbyGranularityByColumn(column);
    return granularityList.map((granularity) => {
      return {
        value: granularity,
        label: <span className="select-option-name">{DISPLAY_GROUP_DATE_GRANULARITY_TEXT[displayGranularity[granularity]]}</span>,
      };
    });
  }, [columns, groupby, DISPLAY_GROUP_DATE_GRANULARITY_TEXT]);

  const selectedCountType = useMemo(() => {
    const { count_type } = groupby;
    const countType = getSelectedCountType(column, count_type);
    if (countType) {
      return {
        label: <span className="select-option-name">{DISPLAY_GROUP_DATE_GRANULARITY_TEXT[countType]}</span>
      };
    }
  }, [column, groupby, DISPLAY_GROUP_DATE_GRANULARITY_TEXT]);

  const deleteGroupby = useCallback((event) => {
    event.nativeEvent.stopImmediatePropagation();
    onDelete(index);
  }, [index, onDelete]);

  const selectColumn = useCallback((option) => {
    const { column_key } = groupby;
    if (option.column.key === column_key) return;
    const sort_type = SORT_TYPE.UP;
    const count_type = getDefaultCountType(option.column);
    const newGroupby = {
      ...groupby,
      ...{ column_key: option.column.key, sort_type, count_type }
    };
    onUpdate(newGroupby, index);
  }, [groupby, index, onUpdate]);

  const selectCountType = useCallback((countType) => {
    const { sort_type } = groupby;
    if (countType === sort_type) return;
    const newGroupby = { ...groupby, count_type: countType };
    onUpdate(newGroupby, index);
  }, [groupby, index, onUpdate]);

  const selectSortType = useCallback((option) => {
    const { count_type } = groupby;
    if (option.sortType === count_type) return;
    const newGroupby = { ...groupby, sort_type: option.sortType };
    onUpdate(newGroupby, index);
  }, [groupby, index, onUpdate]);

  return (
    <div
      ref={ref}
      className={classnames('groupby-item',
        { 'group-can-drop-top': isOver && canDrop && dropPosition === 'top' },
        { 'group-can-drop-bottom': isOver && canDrop && dropPosition === 'bottom' }
      )}
    >
      {!readOnly && (
        <div className="delete-groupby" onClick={deleteGroupby} aria-label={gettext('Delete')}>
          <Icon className="sf-metadata-icon" symbol="fork-number"/>
        </div>
      )}
      <div className="condition">
        <div className="groupby-column">
          <CustomizeSelect
            readOnly={readOnly}
            value={selectedColumn}
            options={columnsOptions}
            onSelectOption={selectColumn}
            searchable={true}
            searchPlaceholder={gettext('Search property')}
            noOptionsPlaceholder={gettext('No results')}
          />
        </div>
        {isShowGroupCountType(column) && (
          <div className="groupby-count-type">
            <CustomizeSelect
              readOnly={readOnly}
              value={selectedCountType}
              onSelectOption={selectCountType}
              options={countTypeOptions}
            />
          </div>
        )}
        <div className="groupby-predicate">
          {(!column.key || SORT_COLUMN_OPTIONS.includes(column.type)) && (
            <CustomizeSelect
              readOnly={readOnly}
              value={selectedSortType}
              options={sortOptions}
              onSelectOption={selectSortType}
            />
          )}
        </div>
      </div>
      {!readOnly && showDragBtn && (
        <div ref={drag} className="groupby-drag">
          <Icon symbol="drag" />
        </div>
      )}
    </div>
  );

};

GroupbyItem.propTypes = {
  index: PropTypes.number,
  readOnly: PropTypes.bool,
  groupby: PropTypes.object,
  columns: PropTypes.array,
  onDelete: PropTypes.func,
  onUpdate: PropTypes.func,
  onMove: PropTypes.func,
};

export default GroupbyItem;
