import React from 'react';
import PropTypes from 'prop-types';
import FileRecord from './file-record';

const FileRecords = ({ records, repoID, renderFolder }) => {
  if (!Array.isArray(records) || records.length === 0) return null;
  return records.map((record, index) => {
    return (
      <FileRecord
        key={index}
        record={record}
        repoID={repoID}
        renderFolder={renderFolder}
      />
    );
  });
};

FileRecords.propTypes = {
  records: PropTypes.array,
};

export default FileRecords;
