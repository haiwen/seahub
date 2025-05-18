import React from 'react';
import { Button } from 'reactstrap';
import { gettext } from '../utils/constants';
import { useMetadataStatus } from '../hooks';
import { eventBus } from '../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../components/common/event-bus-type';

const RepoInfoBarMigrate = () => {

  const { enableMetadataManagement } = useMetadataStatus();
  const openMigrate = () => {
    eventBus.dispatch(EVENT_BUS_TYPE.OPEN_TREE_PANEL, () => eventBus.dispatch(EVENT_BUS_TYPE.OPEN_LIBRARY_SETTINGS_TAGS));
  };

  return (
    <div className="repo-info-bar-migrate mt-2">
      {enableMetadataManagement ? (
        <>
          {gettext('Tips: There are tags of old version. Please migrate tags to new version.')}
          <Button color="link" size="sm" tag="a" onClick={openMigrate}>{gettext('Migrate')}</Button>
        </>
      ) : (
        <>{gettext('Tips: These are tags of old version. The feature is deprecated and can no longer be used.')}</>
      )
      }
    </div>
  );
};

RepoInfoBarMigrate.propTypes = {
};

export default RepoInfoBarMigrate;
