import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import wikiAPI from '@/api/wiki-api';
import { wikiPermission } from '@/utils/constants';
import PageCover from './page-cover';
import PageTitle from './page-title';

function RightHeader({ isUpdateBySide, currentPageConfig, onUpdatePageConfig }) {
  const [available, setAvailable] = useState(false);
  const [isCoverPopoverOpen, setIsCoverPopoverOpen] = useState(false);
  const [coverPanel, setCoverPanel] = useState('gallery');
  useEffect(() => {
    let alive = true;
    if (wikiPermission === 'rw') {
      wikiAPI.getCoverGenerationAvailability().then(response => {
        if (alive) setAvailable(response.data.available === true);
      }).catch(() => {});
    }
    return () => { alive = false; };
  }, []);
  useEffect(() => { setIsCoverPopoverOpen(false); }, [currentPageConfig.id]);
  const props = {
    isUpdateBySide, currentPageConfig, onUpdatePageConfig,
    onGenerateCover: available ? () => {
      setCoverPanel('ai');
      setIsCoverPopoverOpen(true);
    } : null,
  };
  return (
    <>
      <PageCover key={currentPageConfig.id} {...props} aiAvailable={available}
        isPopoverOpen={isCoverPopoverOpen} onPopoverChange={setIsCoverPopoverOpen}
        activePanel={coverPanel} onPanelChange={setCoverPanel} />
      <PageTitle {...props} />
    </>
  );
}

RightHeader.propTypes = {
  isUpdateBySide: PropTypes.bool,
  currentPageConfig: PropTypes.object,
  onUpdatePageConfig: PropTypes.func,
};

export default RightHeader;
