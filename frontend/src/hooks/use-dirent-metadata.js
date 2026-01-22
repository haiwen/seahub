import { useState, useEffect, useCallback, useRef } from 'react';
import metadataAPI from '../metadata/api';
import { PRIVATE_COLUMN_KEY } from '../metadata/constants';
import PropTypes from 'prop-types';

/**
 * LRU Cache for metadata records (max size: 1000 items)
 */
class MetadataCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    // Move to end (mark as recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Custom hook for fetching metadata for dirents with lazy loading.
 * Only fetches metadata for visible items in the virtual list to optimize performance.
 */
export const useDirentMetadata = ({
  repoID,
  path,
  direntList,
  visibleColumns,
  visibleRange,
  overscan = 10,
}) => {
  const [statusColumnOptions, setStatusColumnOptions] = useState(null);
  const [metadataMap, setMetadataMap] = useState(new Map());
  const [isFetching, setIsFetching] = useState(false);
  const [loadingItems, setLoadingItems] = useState(new Set());

  const cacheRef = useRef(new MetadataCache(1000));
  const fetchingRef = useRef(new Set());
  const prevVisibleRangeRef = useRef({ startIndex: 0, endIndex: 0 });
  const fetchInProgressRef = useRef(false);
  const statusColumnOptionsFetchedRef = useRef(false);
  const isMountedRef = useRef(true);

  const needsMetadata = visibleColumns.some(col =>
    col === 'creator' || col === 'last_modifier' || col === 'status'
  );

  const getCacheKey = useCallback((dirent) => {
    return `${dirent.obj_id || dirent.name || dirent._obj_id}`;
  }, []);

  const createFileInfo = useCallback((dirent) => {
    if (!dirent.name) {
      return null;
    }
    return {
      file_name: dirent.name,
      parent_dir: dirent.parent_dir || path || '/',
    };
  }, [path]);

  const fetchMetadataForDirents = useCallback(async (dirents) => {
    if (!repoID || !dirents || dirents.length === 0) {
      return;
    }

    const files = dirents.map(createFileInfo).filter(Boolean);
    if (files.length === 0) {
      return;
    }

    try {
      const response = await metadataAPI.getRecords(repoID, files);
      const results = response.data?.results || [];
      const metadataColumns = response.data?.metadata?.columns || [];

      // Extract status column options from metadata.columns
      if (!statusColumnOptionsFetchedRef.current && metadataColumns.length > 0) {
        const statusColumn = metadataColumns.find(col => col.key === PRIVATE_COLUMN_KEY.FILE_STATUS);
        if (statusColumn && statusColumn.data && statusColumn.data.options) {
          if (isMountedRef.current) {
            setStatusColumnOptions(statusColumn.data.options);
          }
        } else if (isMountedRef.current) {
          setStatusColumnOptions([
            { id: '_in_progress', name: '_in_progress', color: '#EED5FF', textColor: '#212529' },
            { id: '_in_review', name: '_in_review', color: '#FFFDCF', textColor: '#212529' },
            { id: '_done', name: '_done', color: '#59CB74', textColor: '#FFFFFF' },
            { id: '_outdated', name: '_outdated', color: '#C2C2C2', textColor: '#FFFFFF' }
          ]);
        }
        statusColumnOptionsFetchedRef.current = true;
      }

      const newMetadataMap = new Map();
      results.forEach((record) => {
        const fileName = record._name;
        if (fileName) {
          const key = record._obj_id || fileName;
          cacheRef.current.set(key, record);
          newMetadataMap.set(fileName, record);
        }
      });

      if (isMountedRef.current) {
        setMetadataMap(prev => new Map([...prev, ...newMetadataMap]));
      }

      if (isMountedRef.current) {
        setLoadingItems(prev => {
          const newSet = new Set(prev);
          dirents.forEach(dirent => newSet.delete(dirent.name));
          return newSet;
        });
      }

    } catch (error) {
      if (isMountedRef.current) {
        setLoadingItems(prev => {
          const newSet = new Set(prev);
          dirents.forEach(dirent => newSet.delete(dirent.name));
          return newSet;
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
      dirents.forEach(dirent => fetchingRef.current.delete(dirent.name));
    }
  }, [repoID, createFileInfo]);

  useEffect(() => {
    if (!needsMetadata || !visibleRange || !direntList || direntList.length === 0) {
      return;
    }

    const { startIndex, endIndex } = visibleRange;
    const { startIndex: prevStart, endIndex: prevEnd } = prevVisibleRangeRef.current;

    if (startIndex === prevStart && endIndex === prevEnd) {
      return;
    }

    prevVisibleRangeRef.current = { startIndex, endIndex };

    const start = Math.max(0, startIndex - overscan);
    const end = Math.min(direntList.length - 1, endIndex + overscan);

    const visibleDirents = direntList.slice(start, end + 1);

    const direntsNeedingMetadata = visibleDirents.filter(dirent => {
      const cacheKey = getCacheKey(dirent);
      const hasCache = cacheRef.current.has(cacheKey);
      const isCurrentlyFetching = fetchingRef.current.has(dirent.name);
      const needsFetch = !hasCache && !isCurrentlyFetching;

      return needsFetch;
    });

    if (direntsNeedingMetadata.length > 0) {
      if (fetchInProgressRef.current) {
        return;
      }

      direntsNeedingMetadata.forEach(dirent => {
        fetchingRef.current.add(dirent.name);
        setLoadingItems(prev => new Set([...prev, dirent.name]));
      });

      fetchInProgressRef.current = true;
      setIsFetching(true);

      const batchSize = 50;
      const processBatches = async () => {
        try {
          for (let i = 0; i < direntsNeedingMetadata.length; i += batchSize) {
            const batch = direntsNeedingMetadata.slice(i, i + batchSize);
            await fetchMetadataForDirents(batch);
          }
        } finally {
          fetchInProgressRef.current = false;
        }
      };

      processBatches();
    }
  }, [
    needsMetadata,
    visibleRange,
    direntList,
    overscan,
    getCacheKey,
    fetchMetadataForDirents
  ]);

  const getMetadataForDirent = useCallback((dirent) => {
    const cacheKey = getCacheKey(dirent);
    return cacheRef.current.get(cacheKey);
  }, [getCacheKey]);

  const isDirentLoading = useCallback((dirent) => {
    return loadingItems.has(dirent.name);
  }, [loadingItems]);

  const updateDirentStatus = useCallback(async (direntName, newStatus) => {
    if (!repoID || !direntName) {
      return;
    }

    const dirent = direntList.find(d => d.name === direntName);
    if (!dirent) {
      return;
    }

    const parentDir = dirent.parent_dir || path || '/';
    const updateData = { [PRIVATE_COLUMN_KEY.FILE_STATUS]: newStatus };

    try {
      await metadataAPI.modifyRecord(repoID, { parentDir, fileName: direntName }, updateData);

      const cacheKey = getCacheKey(dirent);
      const cachedRecord = cacheRef.current.get(cacheKey);

      if (cachedRecord) {
        const updatedRecord = { ...cachedRecord, [PRIVATE_COLUMN_KEY.FILE_STATUS]: newStatus };
        cacheRef.current.set(cacheKey, updatedRecord);

        setMetadataMap(prev => {
          const newMap = new Map(prev);
          newMap.set(direntName, updatedRecord);
          return newMap;
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  }, [repoID, path, direntList, getCacheKey]);

  useEffect(() => {
    isMountedRef.current = true;
    cacheRef.current.clear();
    setMetadataMap(new Map());
    setLoadingItems(new Set());
    setStatusColumnOptions(null);
    fetchingRef.current.clear();
    fetchInProgressRef.current = false;
    statusColumnOptionsFetchedRef.current = false;
  }, [repoID, path]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    metadataMap,
    isFetching,
    loadingItems,
    getMetadataForDirent,
    isDirentLoading,
    updateDirentStatus,
    needsMetadata,
    statusColumnOptions,
  };
};

useDirentMetadata.propTypes = {
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  direntList: PropTypes.arrayOf(PropTypes.object).isRequired,
  visibleColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  visibleRange: PropTypes.shape({
    startIndex: PropTypes.number,
    endIndex: PropTypes.number,
  }).isRequired,
  overscan: PropTypes.number,
};

export default useDirentMetadata;
