import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label } from 'reactstrap';
import FileOrFolderFilter from './file-folder-filter';
import TableFileTypeFilter from './table-file-type-filter';
import GalleryFileTypeFilter from './gallery-file-type-filter';
import TagsFilter from './tags-filter';
import { gettext } from '../../../../../utils/constants';
import { FILTER_PREDICATE_TYPE, PRIVATE_COLUMN_KEY, VIEW_TYPE } from '../../../../constants';

import './index.css';

const BasicFilters = ({ readOnly, filters = [], onChange, viewType }) => {

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

  const onChangeTagsFilter = useCallback((newValue) => {
    const filterIndex = filters.findIndex(filter => filter.column_key === PRIVATE_COLUMN_KEY.TAGS);
    const filter = filters[filterIndex];
    const newFilters = filters.slice(0);
    newFilters[filterIndex] = { ...filter, filter_predicate: FILTER_PREDICATE_TYPE.HAS_ANY_OF, filter_term: newValue };
    onChange(newFilters);
  }, [filters, onChange]);

  return (
    <FormGroup className="filter-group-basic filter-group p-4">
      <Label className="filter-group-name">{gettext('Basic')}</Label>
      <div className="filter-group-container">
        <div className="sf-metadata-filters-list">
          {filters.map((filter) => {
            const { column_key, filter_term } = filter;
            if (column_key === PRIVATE_COLUMN_KEY.IS_DIR) {
              return (
                <FileOrFolderFilter key={column_key} readOnly={readOnly} value={filter_term} onChange={onChangeFileOrFolderFilter} />
              );
            }
            if (column_key === PRIVATE_COLUMN_KEY.FILE_TYPE) {
              const FileTypeFilter = [VIEW_TYPE.GALLERY, VIEW_TYPE.MAP].includes(viewType) ? GalleryFileTypeFilter : TableFileTypeFilter;
              return (<FileTypeFilter key={column_key} readOnly={readOnly} value={filter_term} onChange={onChangeFileTypeFilter} />);
            }
            if (column_key === PRIVATE_COLUMN_KEY.TAGS) {
              return (<TagsFilter key={column_key} value={filter_term} onChange={onChangeTagsFilter} />);
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
  viewType: PropTypes.oneOf(Object.values(VIEW_TYPE)),
};

export default BasicFilters;
