import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { PRIVATE_COLUMN_KEY } from '../../../constants';
import { FilterSetter, MapTypeSetter } from '../../data-process-setter';

const MapViewToolBar = ({
  readOnly,
  view,
  collaborators,
  modifyFilters,
}) => {
  const viewType = useMemo(() => view.type, [view]);
  const viewColumns = useMemo(() => {
    if (!view) return [];
    return view.columns;
  }, [view]);

  const filterColumns = useMemo(() => {
    return viewColumns.filter(c => c.key !== PRIVATE_COLUMN_KEY.FILE_TYPE);
  }, [viewColumns]);

  return (
    <>
      <div className="sf-metadata-tool-left-operations">
        <MapTypeSetter view={view} />
        <FilterSetter
          isNeedSubmit={true}
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
      </div>
      <div className="sf-metadata-tool-right-operations"></div>
    </>
  );
};

MapViewToolBar.propTypes = {
  readOnly: PropTypes.bool,
  view: PropTypes.object,
  collaborators: PropTypes.array,
  modifyFilters: PropTypes.func,
};

export default MapViewToolBar;
