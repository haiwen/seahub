import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { GalleryGroupBySetter, GallerySliderSetter, FilterSetter, SortSetter } from '../../data-process-setter';
import { PRIVATE_COLUMN_KEY } from '../../../constants';
import { gettext } from '../../../../utils/constants';

const GalleryViewToolbar = ({
  readOnly, isCustomPermission, view, collaborators,
  modifyFilters, modifySorts, showDetail,
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
        <GalleryGroupBySetter view={view} />
        <GallerySliderSetter view={view} />
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
        <SortSetter
          isNeedSubmit={true}
          wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-sort"
          target="sf-metadata-sort-popover"
          readOnly={readOnly}
          sorts={view.sorts}
          type={viewType}
          columns={viewColumns}
          modifySorts={modifySorts}
        />
        {!isCustomPermission && (
          <div className="cur-view-path-btn ml-2" onClick={showDetail}>
            <span className="sf3-font sf3-font-info" aria-label={gettext('Properties')} title={gettext('Properties')}></span>
          </div>
        )}
      </div>
      <div className="sf-metadata-tool-right-operations"></div>
    </>
  );
};

GalleryViewToolbar.propTypes = {
  readOnly: PropTypes.bool,
  isCustomPermission: PropTypes.bool,
  view: PropTypes.object.isRequired,
  collaborators: PropTypes.array,
  modifyFilters: PropTypes.func,
  modifySorts: PropTypes.func,
  showDetail: PropTypes.func,
};

export default GalleryViewToolbar;
