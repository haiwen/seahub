import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY, VIEW_TYPE } from '../../../constants';
import { FilterSetter, GalleryGroupBySetter, MapTypeSetter, SortSetter } from '../../data-process-setter';
import { gettext } from '../../../../utils/constants';

const MapViewToolBar = ({
  isCustomPermission,
  readOnly,
  viewID,
  collaborators,
  modifyFilters,
  onToggleDetail,
}) => {
  const [showGalleryToolbar, setShowGalleryToolbar] = useState(false);
  const [view, setView] = useState({});

  const viewType = useMemo(() => VIEW_TYPE.MAP, []);
  const viewColumns = useMemo(() => {
    if (!view) return [];
    return view.columns;
  }, [view]);

  const filterColumns = useMemo(() => {
    return viewColumns && viewColumns.filter(c => c.key !== PRIVATE_COLUMN_KEY.FILE_TYPE);
  }, [viewColumns]);

  const onToggle = useCallback((value) => {
    setShowGalleryToolbar(value);
  }, []);

  const modifySorts = useCallback((sorts) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_SERVER_VIEW, { sorts });
  }, []);

  const resetView = useCallback(view => {
    setView(view);
  }, []);

  useEffect(() => {
    setShowGalleryToolbar(false);
    const unsubscribeToggle = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_VIEW_TOOLBAR, onToggle);
    const unsubscribeView = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.RESET_VIEW, resetView);
    return () => {
      unsubscribeToggle && unsubscribeToggle();
      unsubscribeView && unsubscribeView();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewID]);

  if (showGalleryToolbar) {
    return (
      <>
        <div className="sf-metadata-tool-left-operations">
          <GalleryGroupBySetter viewID={viewID} />
          <SortSetter
            wrapperClass="sf-metadata-view-tool-operation-btn sf-metadata-view-tool-sort"
            target="sf-metadata-sort-popover"
            readOnly={readOnly}
            sorts={view.sorts}
            type={VIEW_TYPE.MAP}
            columns={viewColumns}
            modifySorts={modifySorts}
          />
          {!isCustomPermission && (
            <div className="cur-view-path-btn ml-2" onClick={onToggleDetail}>
              <span className="sf3-font sf3-font-info" aria-label={gettext('Properties')} title={gettext('Properties')}></span>
            </div>
          )}
        </div>
        <div className="sf-metadata-tool-right-operations"></div>
      </>
    );
  }

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
  isCustomPermission: PropTypes.bool,
  readOnly: PropTypes.bool,
  collaborators: PropTypes.array,
  modifyFilters: PropTypes.func,
  onToggleDetail: PropTypes.func,
};

export default MapViewToolBar;
