import React, { useEffect, useMemo } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { useTags } from '../../hooks';
import Main from './main';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';

import './index.css';

const AllTags = () => {
  const { isLoading, tagsData, context } = useTags();

  useEffect(() => {
    const eventBus = context.eventBus;
    eventBus.dispatch(EVENT_BUS_TYPE.RELOAD_DATA);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tags = useMemo(() => {
    if (!tagsData) return [];
    return tagsData.rows;
  }, [tagsData]);

  if (isLoading) return (<CenteredLoading />);

  return (
    <>
      <div className="sf-metadata-tags-wrapper sf-metadata-all-tags-wrapper">
        <div className="sf-metadata-tags-main">
          <div className="sf-metadata-all-tags-container">
            <Main tags={tags} context={context} />
          </div>
        </div>
      </div>
    </>
  );
};

export default AllTags;
