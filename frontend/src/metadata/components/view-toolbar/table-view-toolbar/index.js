import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { FilterSetter, GroupbySetter, SortSetter, HideColumnSetter } from '../../data-process-setter';
import { PRIVATE_COLUMN_KEY } from '../../../constants';
import { useMetadataStatus } from '../../../../hooks';

const TableViewToolbar = ({
  readOnly, view, collaborators,
  modifyFilters, modifySorts, modifyGroupbys, modifyHiddenColumns, modifyColumnOrder
}) => {
  const { globalHiddenColumns } = useMetadataStatus();
  const viewType = useMemo(() => view.type, [view]);
  const viewColumns = useMemo(() => {
    if (!view) return [];
    return view.columns.filter(column => !globalHiddenColumns.includes(column.key));
  }, [view, globalHiddenColumns]);

  const filterColumns = useMemo(() => {
    return viewColumns.filter(c => c.key !== PRIVATE_COLUMN_KEY.FILE_TYPE);
  }, [viewColumns]);

  return (
    <>
      <div className="sf-metadata-tool-left-operations">
        <FilterSetter
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-filter"
          filtersClassName="sf-metadata-filters"
          target="sf-metadata-filter-popover"
          readOnly={readOnly}
          filterConjunction={view.filter_conjunction}
          basicFilters={view.basic_filters}
          filters={view.filters}
          columns={filterColumns}
          modifyFilters={modifyFilters}
          collaborators={collaborators}
          viewType={viewType}
        />
        <SortSetter
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-sort"
          target="sf-metadata-sort-popover"
          readOnly={readOnly}
          sorts={view.sorts}
          type={viewType}
          columns={viewColumns}
          modifySorts={modifySorts}
        />
        <GroupbySetter
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-groupby"
          target="sf-metadata-groupby-popover"
          readOnly={readOnly}
          columns={viewColumns}
          groupbys={view.groupbys}
          modifyGroupbys={modifyGroupbys}
        />
        <HideColumnSetter
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-hide-column"
          target="sf-metadata-hide-column-popover"
          readOnly={readOnly}
          columns={viewColumns.slice(1)}
          hiddenColumns={view.hidden_columns || []}
          modifyHiddenColumns={modifyHiddenColumns}
          modifyColumnOrder={modifyColumnOrder}
        />
      </div>
      <div className="sf-metadata-tool-right-operations"></div>
    </>
  );
};

TableViewToolbar.propTypes = {
  readOnly: PropTypes.bool,
  view: PropTypes.object.isRequired,
  collaborators: PropTypes.array,
  modifyFilters: PropTypes.func,
  modifySorts: PropTypes.func,
  modifyGroupbys: PropTypes.func,
  modifyHiddenColumns: PropTypes.func,
  modifyColumnOrder: PropTypes.func,
};

export default TableViewToolbar;
