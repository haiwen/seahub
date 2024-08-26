import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label } from 'reactstrap';
import { gettext } from '../../../../utils';
import { PRIVATE_COLUMN_KEY } from '../../../../_basic';
import FileOrFolderFilter from './file-folder-filter';

import './index.css';

const BasicFilters = ({ readOnly, filters = [], onChange }) => {

  const onChangeFileOrFolderFilter = useCallback((newValue) => {
    const filterIndex = filters.findIndex(filter => filter.column_key === PRIVATE_COLUMN_KEY.IS_DIR);
    const filter = filters[filterIndex];
    const newFilters = filters.slice(0);
    newFilters[filterIndex] = { ...filter, filter_term: newValue };
    onChange(newFilters);
  }, [filters, onChange]);

  return (
    <FormGroup className="filter-group p-4">
      <Label className="filter-group-name">{gettext('Basic')}</Label>
      <div className="filter-group-container">
        {filters.map(filter => {
          const { column_key, filter_term } = filter;
          if (column_key === PRIVATE_COLUMN_KEY.IS_DIR) {
            return (
              <FileOrFolderFilter key={column_key} readOnly={readOnly} value={filter_term} onChange={onChangeFileOrFolderFilter} />
            );
          }
          return null;
        })}
      </div>
    </FormGroup>
  );
};

BasicFilters.propTypes = {
  readOnly: PropTypes.bool,
  value: PropTypes.string,
  onChange: PropTypes.func,
};

export default BasicFilters;
