import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Formatter from '../formatter';
import { getCellValueByColumn, isValidCellValue } from '../../../../../utils/cell';
import { CellType } from '../../../../../constants';
import { getEventClassName } from '../../../../../utils/common';

import './index.css';

const Card = ({
  isSelected,
  displayEmptyValue,
  displayColumnName,
  record,
  titleColumn,
  displayColumns,
  onOpenFile,
  onSelectCard,
  onContextMenu,
}) => {
  const titleValue = getCellValueByColumn(record, titleColumn);

  const handleClickCard = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onSelectCard(record);
  }, [record, onSelectCard]);

  const handleClickFilename = useCallback((event) => {
    if (titleColumn?.type !== CellType.FILE_NAME) return;
    const eventName = getEventClassName(event);
    if (eventName !== 'sf-metadata-file-name') return;
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onOpenFile(record);
  }, [titleColumn, record, onOpenFile]);

  return (
    <article
      data-id={record._id}
      className={classnames('sf-metadata-kanban-card', { 'selected': isSelected })}
      onClick={handleClickCard}
      onContextMenu={onContextMenu}
    >
      {titleColumn && (
        <div className="sf-metadata-kanban-card-header" onClick={handleClickFilename}>
          <Formatter value={titleValue} column={titleColumn} record={record}/>
        </div>
      )}
      <div className="sf-metadata-kanban-card-body">
        {displayColumns.map((column) => {
          const value = getCellValueByColumn(record, column);
          if (!displayEmptyValue && !isValidCellValue(value)) {
            if (displayColumnName) {
              return (
                <div className="sf-metadata-kanban-card-record" key={column.key}>
                  <div className="sf-metadata-kanban-card-record-name">{column.name}</div>
                </div>
              );
            }
            return null;
          }

          return (
            <div className="sf-metadata-kanban-card-record" key={column.key}>
              {displayColumnName && (<div className="sf-metadata-kanban-card-record-name">{column.name}</div>)}
              <Formatter value={value} column={column} record={record}/>
            </div>
          );
        })}
      </div>
    </article>
  );
};

Card.propTypes = {
  isSelected: PropTypes.bool,
  displayEmptyValue: PropTypes.bool,
  displayColumnName: PropTypes.bool,
  record: PropTypes.object,
  titleColumn: PropTypes.object,
  displayColumns: PropTypes.array,
  onOpenFile: PropTypes.func.isRequired,
  onSelectCard: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
};

export default Card;
