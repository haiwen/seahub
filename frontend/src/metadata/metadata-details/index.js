import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import metadataAPI from '../api';
import Column from '../metadata-view/model/metadata/column';
import { normalizeFields, getCellValueByColumn } from './utils';
import DetailItem from '../../components/dirent-detail/detail-item';

const MetadataDetails = ({ repoID, filePath, direntType, emptyTip }) => {
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ record: {}, fields: [] });

  useEffect(() => {
    setLoading(true);
    const dirName = Utils.getDirName(filePath);
    const fileName = Utils.getFileName(filePath);
    let parentDir = direntType === 'file' ? dirName : dirName.slice(0, dirName.length - fileName.length - 1);
    if (!parentDir.startsWith('/')) {
      parentDir = '/' + parentDir;
    }
    metadataAPI.getMetadataRecordInfo(repoID, parentDir, fileName).then(res => {
      const { results, metadata } = res.data;
      const record = Array.isArray(results) && results.length > 0 ? results[0] : {};
      const fields = normalizeFields(metadata).map(field => new Column(field));
      setMetadata({ record, fields });
      setLoading(false);
    }).catch(error => {
      setLoading(false);
    });
  }, [repoID, filePath, direntType]);

  if (isLoading) return null;
  const { fields, record } = metadata;
  if (!record._id) return null;
  return fields.map(field => {
    const value = getCellValueByColumn(record, field);
    return (<DetailItem key={field.key} field={field} value={value} emptyTip={emptyTip}/>);
  });
};

MetadataDetails.propTypes = {
  repoID: PropTypes.string,
  filePath: PropTypes.string,
  direntType: PropTypes.string,
  direntDetail: PropTypes.object,
};

export default MetadataDetails;
