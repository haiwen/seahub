import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import CenteredLoading from '../../../../components/centered-loading';
import EmptyTip from '../../../../components/empty-tip';
import { gettext } from '../../../../utils/constants';
import { useMetadataView } from '../../../hooks/metadata-view';
import { PER_LOAD_NUMBER } from '../../../constants';
import toaster from '../../../../components/toast';
import { Utils } from '../../../../utils/utils';
import People from './people';

import './index.css';

const Peoples = ({ peoples, onOpenPeople, onRename }) => {
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [haveFreezed, setHaveFreezed] = useState(false);

  const containerRef = useRef(null);

  const { metadata, store } = useMetadataView();

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    if (!metadata.hasMore) return;
    setLoadingMore(true);

    try {
      await store.loadMore(PER_LOAD_NUMBER);
      setLoadingMore(false);
    } catch (error) {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoadingMore(false);
      return;
    }

  }, [isLoadingMore, metadata, store]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      loadMore();
    }
    window.sfMetadataContext.localStorage.setItem('scroll_top', scrollTop);
  }, [loadMore]);

  const onFreezed = useCallback(() => {
    setHaveFreezed(true);
  }, []);

  const onUnFreezed = useCallback(() => {
    setHaveFreezed(false);
  }, []);

  useEffect(() => {
    const _localStorage = window.sfMetadataContext.localStorage;
    if (!containerRef.current) return;
    const scrollTop = _localStorage.getItem('scroll_top') || 0;
    if (scrollTop) {
      containerRef.current.scrollTop = Number(scrollTop);
    }
    return () => {};
  }, []);

  if (!Array.isArray(peoples) || peoples.length === 0) return (<EmptyTip className="w-100 h-100" text={gettext('Identifying portraits...')} />);

  return (
    <div className="sf-metadata-face-recognition-container sf-metadata-peoples-container" ref={containerRef} onScroll={handleScroll}>
      {peoples.length > 0 && peoples.map((people) => {
        return (
          <People
            key={people._id}
            haveFreezed={haveFreezed}
            people={people}
            onOpenPeople={onOpenPeople}
            onRename={onRename}
            onFreezed={onFreezed}
            onUnFreezed={onUnFreezed}
          />
        );
      })}
      {isLoadingMore && (
        <div className="sf-metadata-face-recognition-loading-more">
          <CenteredLoading />
        </div>
      )}
    </div>
  );
};

Peoples.propTypes = {
  peoples: PropTypes.array,
  onOpenPeople: PropTypes.func,
};

export default Peoples;
