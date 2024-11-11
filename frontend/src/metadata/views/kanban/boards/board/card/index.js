import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getCellValueByColumn, isValidCellValue } from '../../../../../utils/cell';
import Formatter from '../formatter';

import './index.css';

const Card = ({
  readonly,
  displayEmptyValue,
  displayColumnName,
  record,
  titleColumn,
  displayColumns,
}) => {

  const titleValue = getCellValueByColumn(record, titleColumn);

  return (
    <article data-id={record._id} className={classnames('sf-metadata-kanban-card', { 'readonly': readonly })}>
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
              <Formatter value={value} column={column} record={record}/>
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
};

export default Card;
