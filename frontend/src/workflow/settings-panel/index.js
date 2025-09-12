import { useCallback, useState } from 'react';
import classnames from 'classnames';
import Icon from '../../components/icon';
import ClickOutside from '../../components/click-outside';
import { gettext } from '../../utils/constants';

import './index.css';

const WorkflowSettingsPanel = ({ show, title, children, hidePanel }) => {

  return (
    <ClickOutside onClickOutside={hidePanel}>
      <div className={classnames('workflow-settings-panel d-flex flex-column', { show })}>
        <div className="workflow-settings-panel-header d-flex align-items-center justify-content-between">
          <div className="workflow-settings-panel-header-title"><span className="workflow-settings-panel-header-title-text">{title}</span></div>
          <div className="workflow-settings-panel-header-controls">
            <div className="workflow-settings-panel-header-control d-inline-flex align-items-center justify-content-center" title={gettext('Close')} onClick={hidePanel}><Icon symbol="close" /></div>
          </div>
        </div>
        <div className="workflow-settings-panel-body">{children}</div>
      </div>
    </ClickOutside>
  );
};

export default WorkflowSettingsPanel;
