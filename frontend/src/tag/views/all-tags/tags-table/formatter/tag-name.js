import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';
import { getRecordIdFromRecord } from '../../../../../metadata/utils/cell';

const TagNameFormatter = ({ record, isCellSelected, setDisplayTag }) => {
  const tagColor = useMemo(() => {
    return record[PRIVATE_COLUMN_KEY.TAG_COLOR];
  }, [record]);

  const tagName = useMemo(() => {
    return record[PRIVATE_COLUMN_KEY.TAG_NAME];
  }, [record]);

  const onClickName = useCallback(() => {
    if (!isCellSelected) return;
    const tagId = getRecordIdFromRecord(record);
    setDisplayTag(tagId);
  }, [isCellSelected, record, setDisplayTag]);

  return (
    <div className="sf-table-tag-name-formatter sf-table-cell-formatter sf-metadata-ui cell-formatter-container">
      <span className="sf-table-tag-color" style={{ backgroundColor: tagColor }}></span>
      <span className="sf-table-tag-name-wrapper"><span className="sf-table-tag-name" title={tagName} onClick={onClickName}>{tagName}</span></span>
    </div>
  );
};

TagNameFormatter.propTypes = {
  record: PropTypes.object,
  isCellSelected: PropTypes.bool,
  setDisplayTag: PropTypes.func,
};

export default TagNameFormatter;
