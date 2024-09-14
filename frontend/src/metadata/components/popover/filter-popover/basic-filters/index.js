import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label } from 'reactstrap';
import FileOrFolderFilter from './file-folder-filter';
import FileTypeFilter from './file-type-filter';
import { gettext } from '../../../../../utils/constants';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';

import './index.css';

const BasicFilters = ({ readOnly, filters = [], onChange }) => {

  const onChangeFileOrFolderFilter = useCallback((newValue) => {
    const filterIndex = filters.findIndex(filter => filter.column_key === PRIVATE_COLUMN_KEY.IS_DIR);
    const filter = filters[filterIndex];
    const newFilters = filters.slice(0);
    newFilters[filterIndex] = { ...filter, filter_term: newValue };
    onChange(newFilters);
  }, [filters, onChange]);

  const onChangeFileTypeFilter = useCallback((newValue) => {
    const filterIndex = filters.findIndex(filter => filter.column_key === PRIVATE_COLUMN_KEY.FILE_TYPE);
    const filter = filters[filterIndex];
    const newFilters = filters.slice(0);
    newFilters[filterIndex] = { ...filter, filter_term: newValue };
    onChange(newFilters);
  }, [filters, onChange]);

  return (
    <FormGroup className="filter-group-basic filter-group p-4">
      <Label className="filter-group-name">{gettext('Basic')}</Label>
      <div className="filter-group-container">
        <div className="sf-metadata-filters-list">
          {filters.map((filter, index) => {
            const { column_key, filter_term } = filter;
            if (column_key === PRIVATE_COLUMN_KEY.IS_DIR) {
              return (
                <FileOrFolderFilter key={column_key} readOnly={readOnly} value={filter_term} onChange={onChangeFileOrFolderFilter} />
              );
            }
            if (column_key === PRIVATE_COLUMN_KEY.FILE_TYPE) {
              return (
                <FileTypeFilter key={column_key} readOnly={readOnly} value={filter_term} onChange={onChangeFileTypeFilter} />
              );
            }
            return null;
          })}
        </div>
      </div>
    </FormGroup>
  );
};

BasicFilters.propTypes = {
  readOnly: PropTypes.bool,
  filters: PropTypes.array,
  columns: PropTypes.array,
  onChange: PropTypes.func,
};

export default BasicFilters;
