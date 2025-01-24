import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { PRIVATE_COLUMN_KEY, VIEW_TYPE } from '../../../constants';
import { FilterSetter, MapTypeSetter } from '../../data-process-setter';

const MapViewToolBar = ({
  readOnly,
  view: oldView,
  collaborators,
  modifyFilters,
}) => {
  const viewType = useMemo(() => VIEW_TYPE.MAP, []);
  const viewColumns = useMemo(() => {
    if (!oldView) return [];
    return oldView.columns;
  }, [oldView]);
  const viewID = useMemo(() => oldView._id, [oldView]);

  const filterColumns = useMemo(() => {
    return viewColumns && viewColumns.filter(c => c.key !== PRIVATE_COLUMN_KEY.FILE_TYPE);
  }, [viewColumns]);

  return (
    <>
      <div className="sf-metadata-tool-left-operations">
        <MapTypeSetter viewID={viewID} />
        <FilterSetter
          isNeedSubmit={true}
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-filter"
          filtersClassName="sf-metadata-filters"
          target="sf-metadata-filter-popover"
          readOnly={readOnly}
          filterConjunction={oldView.filter_conjunction}
          basicFilters={oldView.basic_filters}
          filters={oldView.filters}
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
