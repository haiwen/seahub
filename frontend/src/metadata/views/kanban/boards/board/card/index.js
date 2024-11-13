import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getCellValueByColumn, isValidCellValue } from '../../../../../utils/cell';
import Formatter from '../formatter';
import { PRIVATE_COLUMN_KEY } from '../../../../../constants';
import { useMetadataView } from '../../../../../hooks/metadata-view';

import './index.css';

const Card = ({
  readonly,
  displayEmptyValue,
  displayColumnName,
  record,
  titleColumn,
  displayColumns,
  onCloseSettings,
}) => {
  const { updateCurrentDirent, showDirentDetail } = useMetadataView();

  const titleValue = getCellValueByColumn(record, titleColumn);

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const name = record[PRIVATE_COLUMN_KEY.FILE_NAME];
    const path = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
    updateCurrentDirent({
      type: 'file',
      name,
      path,
      file_tags: []
    });
    onCloseSettings();
    showDirentDetail();
  }, [record, updateCurrentDirent, showDirentDetail, onCloseSettings]);

  const handleClickFilename = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('click filename');
  }, []);

  return (
    <article
      data-id={record._id}
      className={classnames('sf-metadata-kanban-card', { 'readonly': readonly })}
      onClick={handleClick}
    >
      {titleColumn && (
        <div className="sf-metadata-kanban-card-header">
          <Formatter value={titleValue} column={titleColumn} record={record}/>
        </div>
      )}
      <div className="sf-metadata-kanban-card-body">
        {displayColumns.map((column, index) => {
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
              <div className='file-name-formatter-wrapper' onClick={handleClickFilename}>
                <Formatter value={value} column={column} record={record}/>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
};

Card.propTypes = {
  readonly: PropTypes.bool,
  displayEmptyValue: PropTypes.bool,
  displayColumnName: PropTypes.bool,
  record: PropTypes.object,
  titleColumn: PropTypes.object,
  displayColumns: PropTypes.array,
  onCloseSettings: PropTypes.func.isRequired,
};

export default Card;
