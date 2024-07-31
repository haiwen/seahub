import React, { Fragment, memo, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
import { Icon, CustomizeSelect } from '@seafile/sf-metadata-ui-component';
import ObjectUtils from '../../../../utils/object-utils';
import { getColumnByKey, COLUMNS_ICON_CONFIG, SORT_TYPE, SORT_COLUMN_OPTIONS } from '../../../../_basic';
import { gettext } from '../../../../utils';
import { getGroupbyGranularityByColumn, isShowGroupCountType, getSelectedCountType, getDefaultCountType } from '../../../../utils/groupby-utils';

const dragSource = {
  beginDrag: props => {
    return { idx: props.index, data: props.groupby, mode: 'sfMetadataGroupbyItem' };
  },
  endDrag(props, monitor) {
    const groupSource = monitor.getItem();
    const didDrop = monitor.didDrop();
    let groupTarget = {};
    if (!didDrop) {
      return { groupSource, groupTarget };
    }
  },
  isDragging(props) {
    const { index, dragged } = props;
    const { idx } = dragged;
    return idx > index;
  }
};

const dropTarget = {
  drop(props, monitor) {
    const groupSource = monitor.getItem();
    const { index: targetIdx } = props;
    if (targetIdx !== groupSource.idx) {
      let groupTarget = { idx: targetIdx, data: props.groupby };
      props.onMove(groupSource, groupTarget);
    }
  }
};

const dragCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging(),
});

const dropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
  dragged: monitor.getItem(),
});

/*
  groupby: {
    column_key: 'xxx',
    count_type: 'xxx, // date/geolocation used
    sort_type: 'xxx',
  }
*/
const GroupbyItem = memo(({
  isOver, isDragging, canDrop, connectDragSource, connectDragPreview, connectDropTarget,
  showDragBtn, index, groupby, columns, onDelete, onUpdate
}) => {
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
            <span className="filter-header-icon"><Icon iconName={COLUMNS_ICON_CONFIG[type]} /></span>
            <span className='select-option-name'>{name}</span>
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
        label: <span className='select-option-name'>{gettext('Up')}</span>
      }, {
        value: { sortType: SORT_TYPE.DOWN },
        label: <span className='select-option-name'>{gettext('Down')}</span>
      }
    ];
  }, []);

  const selectedSortType = useMemo(() => {
    return sortOptions.find(option => option.value.sortType === groupby.sort_type);
  }, [sortOptions, groupby]);

  const countTypeOptions = useMemo(() => {
    const column = getColumnByKey(columns, groupby.column_key);
    const { granularityList, displayGranularity } = getGroupbyGranularityByColumn(column);
    return granularityList.map((granularity) => {
      return {
        value: granularity,
        label: <span className='select-option-name'>{gettext(displayGranularity[granularity])}</span>,
      };
    });
  }, [columns, groupby]);

  const selectedCountType = useMemo(() => {
    const { count_type } = groupby;
    const countType = getSelectedCountType(column, count_type);
    if (countType) {
      return {
        label: <span className='select-option-name'>{gettext(countType)}</span>
      };
    }
  }, [column, groupby]);

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

  return connectDropTarget(
    connectDragPreview(
      <div
        className={classnames('groupby-item',
          { 'group-can-drop-top': isOver && canDrop && isDragging },
          { 'group-can-drop': isOver && canDrop && !isDragging }
        )}
      >
        <div className="delete-groupby" onClick={deleteGroupby} aria-label={gettext('Delete')}>
          <Icon iconName="fork-number"/>
        </div>
        <div className="condition">
          <div className="groupby-column">
            <CustomizeSelect
              value={selectedColumn}
              options={columnsOptions}
              onSelectOption={selectColumn}
              searchable={true}
              searchPlaceholder={gettext('Search column')}
              noOptionsPlaceholder={gettext('No results')}
            />
          </div>
          {isShowGroupCountType(column) && (
            <div className="groupby-count-type">
              <CustomizeSelect
                value={selectedCountType}
                onSelectOption={selectCountType}
                options={countTypeOptions}
              />
            </div>
          )}
          <div className="groupby-predicate">
            {(!column.key || SORT_COLUMN_OPTIONS.includes(column.type)) && (
              <CustomizeSelect
                value={selectedSortType}
                options={sortOptions}
                onSelectOption={selectSortType}
              />
            )}
          </div>
        </div>
        {showDragBtn && connectDragSource(
          <div className="groupby-drag">
            <Icon iconName="drag" />
          </div>
        )}
      </div>
    )
  );

}, (props, nextProps) => {
  const isChanged =
    props.index !== nextProps.index ||
    !ObjectUtils.isSameObject(props.groupby, nextProps.groupby) ||
    props.isDragging !== nextProps.isDragging ||
    props.isOver !== nextProps.isOver ||
    props.canDrop !== nextProps.canDrop ||
    props.showDragBtn !== nextProps.showDragBtn;
  return !isChanged;
});

GroupbyItem.propTypes = {
  index: PropTypes.number,
  groupby: PropTypes.object,
  columns: PropTypes.array,
  onDelete: PropTypes.func,
  onUpdate: PropTypes.func,

  // drag
  isDragging: PropTypes.bool,
  isOver: PropTypes.bool,
  canDrop: PropTypes.bool,
  connectDropTarget: PropTypes.func,
  connectDragSource: PropTypes.func,
  connectDragPreview: PropTypes.func,
};

export default DropTarget('sfMetadataGroupbyItem', dropTarget, dropCollect)(
  DragSource('sfMetadataGroupbyItem', dragSource, dragCollect)(GroupbyItem)
);
