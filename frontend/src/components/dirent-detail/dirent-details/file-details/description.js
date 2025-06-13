import { useCallback, useMemo } from 'react';
import { useMetadataDetails } from '../../../../metadata';
import { getCellValueByColumn } from '../../../../metadata/utils/cell';
import { PRIVATE_COLUMN_KEY } from '../../../../metadata/constants';
import LongTextEditor from '../../../../metadata/components/detail-editor/long-text-editor';
import { getColumnDisplayName } from '../../../../metadata/utils/column';
import { gettext } from '../../../../utils/constants';
import { getTrimmedString } from '../../../../metadata/utils/common';

const Description = () => {
  const { record, onChange } = useMetadataDetails();

  const content = useMemo(() => {
    let value = getCellValueByColumn(record, { key: PRIVATE_COLUMN_KEY.FILE_DESCRIPTION });
    return getTrimmedString(value);
  }, [record]);

  const handleChange = useCallback((value) => {
    const trimmed = getTrimmedString(value).replace(/^[\s\u200B]+|[\s\u200B]+$/g, '');
    onChange && onChange(PRIVATE_COLUMN_KEY.FILE_DESCRIPTION, trimmed);
  }, [onChange]);

  const column = { key: PRIVATE_COLUMN_KEY.FILE_DESCRIPTION, name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_DESCRIPTION) };

  return (
    <div className="sf-metadata-dirent-detail-description-container">
      <LongTextEditor field={column} value={content} placeholder={gettext('Add description')} textNeedSlice={false} onChange={handleChange} />
    </div>
  );
};

export default Description;
