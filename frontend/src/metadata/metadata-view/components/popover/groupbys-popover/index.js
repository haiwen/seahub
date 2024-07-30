import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledPopover } from 'reactstrap';
import isHotkey from 'is-hotkey';
import { CustomizeAddTool } from '@seafile/sf-metadata-ui-component';
import {
  MAX_GROUP_LEVEL,
} from '../../../_basic';
import { generateDefaultGroupby, getGroupbyColumns } from '../../../utils/groupby-utils';
import { EVENT_BUS_TYPE } from '../../../constants';
import { gettext, getEventClassName } from '../../../utils';
import Groupbys from './groupbys';

import './index.css';

const GroupbysPopover = ({ groupbys: propsGroupBys, hidePopover, onChange, target, placement, columns }) => {
  const [groupbys, setGroupbys] = useState(propsGroupBys);
  const isSelectOpenRef = useState(false);
  const popoverRef = useRef(null);

  const hide = useCallback((event) => {
    if (popoverRef.current && !getEventClassName(event).includes('popover') && !popoverRef.current.contains(event.target)) {
      hidePopover(event);
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, [hidePopover]);

  const onHotKey = useCallback((event) => {
    if (isHotkey('esc', event) && !isSelectOpenRef.current) {
      event.preventDefault();
      hidePopover();
    }
  }, [isSelectOpenRef, hidePopover]);

  const setSelectStatus = useCallback((status) => {
    isSelectOpenRef.current = status;
  }, [isSelectOpenRef]);

  useEffect(() => {
    document.addEventListener('click', hide, true);
    document.addEventListener('keydown', onHotKey);
    const unsubscribeOpenSelect = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.OPEN_SELECT, setSelectStatus);
    return () => {
      document.removeEventListener('click', hide, true);
      document.removeEventListener('keydown', onHotKey);
      unsubscribeOpenSelect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateGroups = useCallback((newGroupBys) => {
    setGroupbys(newGroupBys);
    onChange(newGroupBys);
  }, [onChange]);

  const addGroupby = useCallback((event) => {
    event && event.nativeEvent.stopImmediatePropagation();
    const groupbyColumns = getGroupbyColumns(columns);
    console.log(groupbyColumns);
    if (!Array.isArray(groupbyColumns) || groupbyColumns.length === 0) return;
    const groupby = generateDefaultGroupby(groupbyColumns);
    groupbys.push(groupby);
    updateGroups(groupbys);
  }, [groupbys, columns, updateGroups]);

  const deleteGroup = useCallback((groupbyIndex) => {
    const newGroupBys = groupbys.slice(0);
    newGroupBys.splice(groupbyIndex, 1);
    updateGroups(newGroupBys);
  }, [groupbys, updateGroups]);

  const updateGroup = useCallback((groupby, groupbyIndex) => {
    const newGroupbys = groupbys.slice(0);
    newGroupbys[groupbyIndex] = groupby;
    updateGroups(newGroupbys);
  }, [groupbys, updateGroups]);

  const moveGroupbys = useCallback((source, target) => {
    const newGroupbys = groupbys.slice(0);
    newGroupbys.splice(source.idx, 1);
    newGroupbys.splice(target.idx, 0, source.data);
    updateGroups(newGroupbys);
  }, [groupbys, updateGroups]);

  const hideAllGroups = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.COLLAPSE_ALL_GROUPS);
  }, []);

  const showAllGroups = useCallback(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.EXPAND_ALL_GROUPS);
  }, []);

  const onPopoverInsideClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  return (
    <UncontrolledPopover
      placement={placement}
      isOpen={true}
      target={target}
      fade={false}
      hideArrow={true}
      className="sf-metadata-groupbys-popover"
      boundariesElement={document.body}
    >
      <div ref={popoverRef} onClick={onPopoverInsideClick} className="sf-metadata-groupbys">
        <Groupbys groupbys={groupbys} columns={columns} onDelete={deleteGroup} onUpdate={updateGroup} onMove={moveGroupbys} />
        {(groupbys.length < MAX_GROUP_LEVEL) && (
          <CustomizeAddTool
            className="popover-add-tool"
            callBack={addGroupby}
            footerName={gettext('Add group')}
            addIconClassName="popover-add-icon"
          />
        )}
        {groupbys.length > 0 && (
          <div className="groupbys-tools">
            <span className="groupbys-tool-item" onClick={hideAllGroups}>{gettext('Collapse all')}</span>
            <span className="groupbys-tool-item" onClick={showAllGroups}>{gettext('Expand all')}</span>
          </div>
        )}
      </div>
    </UncontrolledPopover>
  );
};

GroupbysPopover.propTypes = {
  target: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.node]),
  groupbys: PropTypes.array,
  columns: PropTypes.array,
  hidePopover: PropTypes.func,
  modifyGroupbys: PropTypes.func,
};

export default GroupbysPopover;
