import React, { useCallback, useMemo } from 'react';
import FixedWidthTable from '../../../../components/fixed-width-table';
import { Utils } from '../../../../utils/utils';
import { gettext } from '../../../../utils/constants';
import classNames from 'classnames';
import { getRecordIdFromRecord } from '../../../../metadata/utils/cell';
import { useTags, useTagView } from '../../../hooks';
import TagFile from './item';
import { hideMenu } from '../../../../components/context-menu/actions';
import Icon from '../../../../components/icon';

const ListView = ({ repoID, openImagePreview, onTagFileContextMenu }) => {
  const { tagsData } = useTags();
  const { tagFiles, selectedFileIds, sortBy, sortOrder, updateSelectedFileIds, modifyTagFilesSort } = useTagView();

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
    modifyTagFilesSort({ sort_by: sortBy, order });
  }, [sortOrder, modifyTagFilesSort]);

  const onSortSize = useCallback((e) => {
    e.preventDefault();
    const sortBy = 'size';
    const order = sortOrder == 'asc' ? 'desc' : 'asc';
    modifyTagFilesSort({ sort_by: sortBy, order });
  }, [sortOrder, modifyTagFilesSort]);

  const onSortTime = useCallback((e) => {
    e.preventDefault();
    const sortBy = 'time';
    const order = sortOrder == 'asc' ? 'desc' : 'asc';
    modifyTagFilesSort({ sort_by: sortBy, order });
  }, [sortOrder, modifyTagFilesSort]);

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

  const onContainerClick = useCallback(() => {
    hideMenu();
    updateSelectedFileIds([]);
  }, [updateSelectedFileIds]);

  const sortIcon = <span className="d-inline-flex align-items-center ml-1"><Icon symbol="down" className={classNames('w-3 h-3', sortOrder == 'asc' ? 'rotate-180 d-inline-flex' : '')} /></span>;

  const headers = [
    {
      isFixed: true,
      name: 'select-input',
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
      name: 'file-icon',
      width: 41,
      className: 'pl-2 pr-2',
    }, {
      isFixed: false,
      name: 'file-name',
      width: 0.5,
      children: (
        <a className="d-inline-flex align-items-center table-sort-op" href="#" onClick={onSortName}>
          {gettext('Name')} {sortBy == 'name' && sortIcon}
        </a>
      ),
    }, {
      isFixed: false,
      name: 'file-tags',
      width: 0.24,
    }, {
      isFixed: false,
      name: 'file-size',
      width: 0.11,
      children: (
        <a className="d-inline-flex align-items-center table-sort-op" href="#" onClick={onSortSize}>
          {gettext('Size')} {sortBy == 'size' && sortIcon}
        </a>
      ),
    }, {
      isFixed: false,
      name: 'file-last-update',
      width: 0.15,
      children: (
        <a className="d-inline-flex align-items-center table-sort-op" href="#" onClick={onSortTime}>
          {gettext('Last modified')} {sortBy == 'time' && sortIcon}
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
