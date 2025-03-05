import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledPopover } from 'reactstrap';
import isHotkey from 'is-hotkey';
import CommonAddTool from '../../../../components/common-add-tool';
import Groupbys from './groupbys';
import { gettext } from '../../../../utils/constants';
import { generateDefaultGroupby, getGroupbyColumns } from '../../../utils/group';
import { getEventClassName } from '../../../../utils/dom';
import { EVENT_BUS_TYPE, MAX_GROUP_LEVEL } from '../../../constants';

import './index.css';

const GroupbysPopover = ({ groupbys: propsGroupBys, readOnly, hidePopover, onChange, target, placement, columns }) => {
  const [groupbys, setGroupbys] = useState(propsGroupBys);
  const [isChanged, setChanged] = useState(false);
  const isSelectOpenRef = useState(false);
  const popoverRef = useRef(null);

  const onClosePopover = useCallback(() => {
    if (isChanged) {
      onChange(groupbys);
    }
    hidePopover();
  }, [isChanged, groupbys, onChange, hidePopover]);

  const hide = useCallback((event) => {
    if (popoverRef.current && !getEventClassName(event).includes('popover') && !popoverRef.current.contains(event.target)) {
      onClosePopover();
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, [onClosePopover]);

  const onHotKey = useCallback((event) => {
    if (isHotkey('esc', event) && !isSelectOpenRef.current) {
      event.preventDefault();
      onClosePopover();
    }
  }, [isSelectOpenRef, onClosePopover]);

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
  }, [hide, onHotKey, setSelectStatus]);

  const updateGroups = useCallback((newGroupBys) => {
    setChanged(true);
    setGroupbys(newGroupBys);
  }, []);

  const addGroupby = useCallback((event) => {
    event && event.nativeEvent.stopImmediatePropagation();
    const groupbyColumns = getGroupbyColumns(columns);
    if (!Array.isArray(groupbyColumns) || groupbyColumns.length === 0) return;
    const groupby = generateDefaultGroupby(groupbyColumns);
    const newGroupBys = groupbys.slice(0);
    newGroupBys.push(groupby);
    updateGroups(newGroupBys);
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
        <Groupbys readOnly={readOnly} groupbys={groupbys} columns={columns} onDelete={deleteGroup} onUpdate={updateGroup} onMove={moveGroupbys} />
        {!readOnly && (groupbys.length < MAX_GROUP_LEVEL) && (
          <CommonAddTool
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
  readOnly: PropTypes.bool,
  target: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.node]),
  groupbys: PropTypes.array,
  columns: PropTypes.array,
  hidePopover: PropTypes.func,
  modifyGroupbys: PropTypes.func,
};

export default GroupbysPopover;
