import React, { useCallback, useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import Icon from '../../../components/icon';
import ClickOutside from '../../../components/click-outside';
import { gettext } from '../../../utils/constants';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { useWorkflows } from '../../hooks/workflows';

import './index.css';

const WorkflowSettingsPanelBody = ({ children }) => {
  return (
    <div className="workflow-settings-panel-body d-flex flex-column">{children}</div>
  );
};

const WorkflowSettingsPanel = ({ title, children, closePanel }) => {
  const [show, setShow] = useState(false);

  const { workflowEventBus } = useWorkflows();

  const setSettingsModeTimerRef = useRef(null);

  useEffect(() => {
    setShow(true);
  }, []);

  const clearTimer = useCallback(() => {
    if (setSettingsModeTimerRef.current) {
      clearTimeout(setSettingsModeTimerRef.current);
      setSettingsModeTimerRef.current = null;
    }
  }, []);

  const hidePanel = useCallback(() => {
    setShow(false);

    clearTimer();
    setSettingsModeTimerRef.current = setTimeout(() => {
      closePanel();
    }, 300);
  }, [clearTimer, closePanel]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    const unsubscribeHidePanel = workflowEventBus.subscribe(EVENT_BUS_TYPE.HIDE_PANEL, hidePanel);
    return () => {
      unsubscribeHidePanel();
    };
  }, [workflowEventBus, hidePanel]);

  return (
    <ClickOutside onClickOutside={hidePanel}>
      <div className={classnames('workflow-settings-panel d-flex flex-column', { show })}>
        <div className="workflow-settings-panel-header d-flex align-items-center justify-content-between">
          <div className="workflow-settings-panel-header-title"><span className="workflow-settings-panel-header-title-text">{title}</span></div>
          <div className="workflow-settings-panel-header-controls">
            <div className="workflow-settings-panel-header-control d-inline-flex align-items-center justify-content-center" title={gettext('Close')} onClick={hidePanel}><Icon symbol="close" /></div>
          </div>
        </div>
        {children}
      </div>
    </ClickOutside>
  );
};

export { WorkflowSettingsPanelBody };

export default WorkflowSettingsPanel;
