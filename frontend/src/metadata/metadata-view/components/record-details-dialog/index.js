import React, { useMemo } from 'react';
import RecordDetails from './record-details';
import { useMetadata, useRecordDetails } from '../../hooks';

const RecordDetailsDialog = () => {
  const { isShowRecordDetails, recordDetails, closeRecordDetails } = useRecordDetails();
  const { metadata } = useMetadata();
  const fields = useMemo(() => {
    const { columns, hidden_columns } = metadata.view;
    return columns.filter(column => !hidden_columns.includes(column.key));
  }, [metadata]);
  if (!isShowRecordDetails) return null;

  const props = {
    record: recordDetails,
    fields: fields,
    onToggle: closeRecordDetails,
  };
  return (<RecordDetails { ...props } />);
};

export default RecordDetailsDialog;
