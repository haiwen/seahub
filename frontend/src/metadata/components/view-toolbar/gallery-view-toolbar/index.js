import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { GalleryGroupBySetter, GallerySliderSetter, FilterSetter, SortSetter } from '../../data-process-setter';
import { EVENT_BUS_TYPE, GALLERY_DATE_MODE, PRIVATE_COLUMN_KEY } from '../../../constants';
import { gettext } from '../../../../utils/constants';

const GalleryViewToolbar = ({
  readOnly, isCustomPermission, view, collaborators,
  modifyFilters, modifySorts, onToggleDetail,
}) => {
  const [currentMode, setCurrentMode] = useState(GALLERY_DATE_MODE.YEAR);

  const viewType = useMemo(() => view.type, [view]);
  const viewColumns = useMemo(() => {
    if (!view) return [];
    return view.columns;
  }, [view]);

  const filterColumns = useMemo(() => {
    return viewColumns.filter(c => c.key !== PRIVATE_COLUMN_KEY.FILE_TYPE);
  }, [viewColumns]);

  const handleGroupByChange = useCallback((newMode) => {
    window.sfMetadataContext.localStorage.setItem('gallery-group-by', newMode);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_GALLERY_GROUP_BY, newMode);
  }, []);

  useEffect(() => {
    const unsubscribeGalleryGroupBy = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.SWITCH_GALLERY_GROUP_BY, (newMode) => {
      if (newMode === currentMode) return;
      setCurrentMode(newMode);
    });

    return () => {
      unsubscribeGalleryGroupBy();
    };
  }, [currentMode]);

  useEffect(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem('gallery-group-by', GALLERY_DATE_MODE.YEAR);
    setCurrentMode(savedValue || GALLERY_DATE_MODE.YEAR);
  }, [view?._id]);

  return (
    <>
      <div className="sf-metadata-tool-left-operations">
        {currentMode === GALLERY_DATE_MODE.ALL && <GallerySliderSetter view={view} />}
        <GalleryGroupBySetter mode={currentMode} onGroupByChange={handleGroupByChange} />
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
        {!isCustomPermission && (
          <div className="cur-view-path-btn ml-2" onClick={onToggleDetail}>
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
  onToggleDetail: PropTypes.func,
};

export default GalleryViewToolbar;
