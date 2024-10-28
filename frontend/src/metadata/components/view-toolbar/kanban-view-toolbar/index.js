import React from 'react';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { EVENT_BUS_TYPE } from '../../../constants';

const KanbanViewToolBar = () => {

  const onToggleKanbanSetting = () => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_KANBAN_SETTING);
  };

  return (
    <IconBtn
      iconName="set-up"
      className='sf-metadata-view-tool-operation-btn sf-metadata-view-tool-setting'
      size={24}
      role="button"
      aria-label="Setting"
      tabIndex={0}
      onClick={onToggleKanbanSetting}
    />
  );
};

export default KanbanViewToolBar;
