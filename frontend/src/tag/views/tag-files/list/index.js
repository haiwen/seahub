import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import Icon from '../../../../components/icon';
import FixedWidthTable from '../../../../components/common/fixed-width-table';
import { hideMenu } from '../../../../components/context-menu/actions';
import { Utils } from '../../../../utils/utils';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE } from '../../../../metadata/constants';
import { getRecordIdFromRecord } from '../../../../metadata/utils/cell';
import { useTags, useTagView } from '../../../hooks';
import TagFile from './tag-file';

const ListView = ({ repoID, openImagePreview, renameTagFile, onTagFileContextMenu }) => {
  const [renameTargetId, setRenameTargetId] = useState(null);

  const { tagsData } = useTags();
  const { tagFiles, selectedFileIds, sortBy, sortOrder, updateSelectedFileIds } = useTagView();
  const eventBus = useMemo(() => window.sfTagsDataContext?.eventBus, []);

  const isSelectedAll = useMemo(() => {
    return selectedFileIds ? selectedFileIds.length === tagFiles.rows.length : false;
  }, [selectedFileIds, tagFiles]);

  const hasSelectedFiles = useMemo(() => {
    return selectedFileIds && selectedFileIds.length > 0;
  }, [selectedFileIds]);

  const isPartiallySelected = useMemo(() => {
    return hasSelectedFiles && !isSelectedAll;
  }, [hasSelectedFiles, isSelectedAll]);

  const onSelectedAll = useCallback((e) => {
    e.stopPropagation();
    if (hasSelectedFiles || isSelectedAll) {
      updateSelectedFileIds([]);
    } else {
      const allIds = tagFiles.rows.map(record => getRecordIdFromRecord(record));
      updateSelectedFileIds(allIds);
    }
  }, [tagFiles, hasSelectedFiles, isSelectedAll, updateSelectedFileIds]);

  const onSortName = useCallback((e) => {
    e.preventDefault();
    const sortBy = 'name';
    const order = sortOrder == 'asc' ? 'desc' : 'asc';
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_TAG_FILES_SORT, { sort_by: sortBy, order });
  }, [sortOrder, eventBus]);

  const onSortSize = useCallback((e) => {
    e.preventDefault();
    const sortBy = 'size';
    const order = sortOrder == 'asc' ? 'desc' : 'asc';
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_TAG_FILES_SORT, { sort_by: sortBy, order });
  }, [sortOrder, eventBus]);

  const onSortTime = useCallback((e) => {
    e.preventDefault();
    const sortBy = 'time';
    const order = sortOrder == 'asc' ? 'desc' : 'asc';
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_TAG_FILES_SORT, { sort_by: sortBy, order });
  }, [sortOrder, eventBus]);

  const onMouseDown = useCallback((event) => {
    if (event.button === 2) {
      event.stopPropagation();
      return;
    }
  }, []);

  const onThreadMouseDown = useCallback((event) => {
    onMouseDown(event);
  }, [onMouseDown]);

  const onThreadContextMenu = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const onSelectFile = useCallback((fileIds) => {
    updateSelectedFileIds(fileIds);
  }, [updateSelectedFileIds]);

  const onRenameCancel = useCallback(() => {
    setRenameTargetId(null);
  }, []);

  const onRenameConfirm = useCallback((newName) => {
    onRenameCancel();
    renameTagFile(newName);
  }, [onRenameCancel, renameTagFile]);

  const onContainerClick = useCallback(() => {
    hideMenu();
    if (!renameTargetId) updateSelectedFileIds([]);
  }, [renameTargetId, updateSelectedFileIds]);

  useEffect(() => {
    if (!window.sfTagsDataContext) return;
    const unsubscribeRenameTagFile = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.RENAME_TAG_FILE_IN_SITU, (id) => setRenameTargetId(id));

    return () => {
      unsubscribeRenameTagFile && unsubscribeRenameTagFile();
    };
  }, []);

  const sortIcon = (
    <span className="d-inline-flex align-items-center ml-1">
      <Icon symbol="arrow-down" className={classNames('w-3 h-3', sortOrder == 'asc' ? 'rotate-180 d-inline-flex' : '')} />
    </span>
  );

  const headers = [
    {
      isFixed: true,
      width: 31,
      className: 'pl10 pr-2 cursor-pointer',
      children: (
        <div
          className="select-all-checkbox-wrapper"
          onClick={onSelectedAll}
          onKeyDown={Utils.onKeyDown}
          role="button"
          tabIndex={0}
          aria-label={isSelectedAll ? gettext('Unselect all') : gettext('Select all')}
          title={isSelectedAll ? gettext('Unselect all') : gettext('Select all')}
        >
          {isPartiallySelected ? (
            <Icon symbol="partially-selected" />
          ) : (
            <input
              type="checkbox"
              className="cursor-pointer form-check-input"
              checked={isSelectedAll}
              disabled={tagFiles.rows.length === 0}
              onChange={() => {}}
              readOnly
            />
          )}
        </div>
      )
    }, {
      isFixed: true,
      width: 41,
      className: 'pl-2 pr-2',
    }, {
      isFixed: false,
      width: 0.5,
      children: (
        <a className="d-inline-flex align-items-center table-sort-op" href="#" onClick={onSortName}>
          {gettext('Name')} {sortBy == 'name' && sortIcon}
        </a>
      ),
    }, {
      isFixed: false,
      width: 0.06,
    }, {
      isFixed: false,
      width: 0.18,
    }, {
      isFixed: false,
      width: 0.11,
      children: (
        <a className="d-inline-flex align-items-center table-sort-op" href="#" onClick={onSortSize}>
          {gettext('Size')} {sortBy == 'size' && sortIcon}
        </a>
      ),
    }, {
      isFixed: false,
      width: 0.15,
      children: (
        <a className="d-inline-flex align-items-center table-sort-op" href="#" onClick={onSortTime}>
          {gettext('Last Update')} {sortBy == 'time' && sortIcon}
        </a>
      ),
    }
  ];
  const mobileHeaders = [
    { isFixed: false, width: 0.12 },
    { isFixed: false, width: 0.8 },
    { isFixed: false, width: 0.08 },
  ];
  const isDesktop = Utils.isDesktop();
  return (
    <div className="table-container user-select-none" onClick={onContainerClick}>
      <FixedWidthTable
        headers={isDesktop ? headers : mobileHeaders}
        className={classNames('table-hover', { 'table-thead-hidden': !isDesktop })}
        theadOptions={isDesktop ? {
          onMouseDown: onThreadMouseDown,
          onContextMenu: onThreadContextMenu,
        } : {}}
      >
        {tagFiles.rows.map(file => {
          const fileId = getRecordIdFromRecord(file);
          return (
            <TagFile
              key={fileId}
              repoID={repoID}
              file={file}
              tagsData={tagsData}
              isRenaming={renameTargetId === fileId}
              onRenameCancel={onRenameCancel}
              onRenameConfirm={onRenameConfirm}
              selectedFileIds={selectedFileIds}
              onSelectFile={onSelectFile}
              openImagePreview={openImagePreview}
              onContextMenu={onTagFileContextMenu}
            />);
        })}
      </FixedWidthTable>
    </div>
  );
};

export default ListView;
