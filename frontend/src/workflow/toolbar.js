import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import toaster from '../components/toast';
import Loading from '../components/loading';
import WorkflowNameEditor from './components/name-editor';
import { useWorkflows } from './hooks/workflows';
import { useWorkflow } from './hooks/workflow';
import { gettext } from '../utils/constants';
import { EVENT_BUS_TYPE } from './constants/event-bus-type';

export const SAVE_STATUS = {
  SAVING: 'saving',
  SUCCESS: 'success',
  NONE: 'none'
};

const WorkflowToolbar = ({ selectedWorkflow, isSidePanelFolded, onToggleSidePanelFolded }) => {
  const { repoName, selectedWorkflowId, workflowEventBus, modifyWorkflow } = useWorkflows();
  const { isChanged, saveChanges } = useWorkflow();
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [saveStatus, setSaveStatus] = useState(SAVE_STATUS.NONE);

  const saveTimer = useRef(null);

  const selectedWorkflowName = useMemo(() => selectedWorkflow?.name || '', [selectedWorkflow]);
  const disabled = useMemo(() => !isChanged || saveStatus !== SAVE_STATUS.NONE, [isChanged, saveStatus]);

  const clearTimer = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, []);

  const successCallback = useCallback(() => {
    clearTimer();
    setSaveStatus(SAVE_STATUS.NONE);
  }, [clearTimer]);

  const failCallback = useCallback(() => {
    clearTimer();
    saveTimer.current = setTimeout(() => {
      setSaveStatus(SAVE_STATUS.NONE);
    }, 500);
  }, [clearTimer]);

  const execSave = useCallback((saveCallback) => {
    if (disabled) return;
    setSaveStatus(SAVE_STATUS.SAVING);
    saveChanges({
      successCallback: () => {
        successCallback();
        saveCallback && saveCallback();
      },
      failCallback,
    });
  }, [saveChanges, disabled, successCallback, failCallback]);

  const handleSave = useCallback(() => {
    if (disabled) return;
    execSave();
  }, [execSave, disabled]);

  const onDeleteWorkflow = useCallback(() => {
    workflowEventBus.dispatch(EVENT_BUS_TYPE.SET_DELETE_WORKFLOW, selectedWorkflow);
  }, [workflowEventBus, selectedWorkflow]);

  const openNameEditor = useCallback(() => {
    setIsEditingName(true);
  }, []);

  const closeNameEditor = useCallback(() => {
    setIsEditingName(false);
  }, []);

  const handleModifyName = useCallback((name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toaster.closeAll();
      toaster.danger(gettext('Name is required'));
      return;
    }
    if (trimmedName === selectedWorkflowName) {
      closeNameEditor();
      return;
    }
    modifyWorkflow(
      selectedWorkflowId,
      { name: trimmedName },
      { successCallback: () => closeNameEditor() }
    );
  }, [selectedWorkflowName, selectedWorkflowId, modifyWorkflow, closeNameEditor]);

  useEffect(() => {
    const unsubscribeExecSave = workflowEventBus.subscribe(EVENT_BUS_TYPE.SAVE_WORKFLOW, execSave);
    return () => {
      unsubscribeExecSave();
    };
  }, [execSave, workflowEventBus]);

  return (
    <div className="cur-view-path lib-workflow-path">
      <div className="cur-view-path-left">
        <div className="path-container">
          <span
            className="cur-view-path-btn mr-1"
            title={isSidePanelFolded ? gettext('Open the panel') : gettext('Close the panel')}
            onClick={onToggleSidePanelFolded}
          >
            <span className="sf3-font-side-bar sf3-font"></span>
          </span>
          <span className="path-item path-item-read-only">{gettext('Files')}</span>
          <span className="path-split">/</span>
          <span className="path-item path-item-read-only">{repoName}</span>
          <span className="path-split">/</span>
          <span className="path-item path-item-read-only">{gettext('Workflow')}</span>
          {selectedWorkflowName && (
            <>
              <span className="path-split">/</span>
              {!isEditingName && (
                <Dropdown isOpen={isDropdownMenuOpen} toggle={() => setIsDropdownMenuOpen(!isDropdownMenuOpen)}>
                  <DropdownToggle tag="span"
                    role="button"
                    className="path-item selected-workflow"
                  >
                    <span className="selected-workflow-name text-truncate" title={selectedWorkflowName}>{selectedWorkflowName}</span>
                    <i className="sf3-font sf3-font-down ml-1"></i>
                  </DropdownToggle>
                  <DropdownMenu className='position-fixed'>
                    <DropdownItem onClick={openNameEditor}>{gettext('Rename workflow')}</DropdownItem>
                    <DropdownItem onClick={onDeleteWorkflow}>{gettext('Delete workflow')}</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              )}
              {isEditingName && (
                <span className="path-item">
                  <WorkflowNameEditor
                    initialName={selectedWorkflowName}
                    onCancel={closeNameEditor}
                    saveName={handleModifyName}
                  />
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="cur-view-path-right py-1">
        <Button color='primary' size='sm' className="save-workflow-btn" disabled={disabled} onClick={handleSave}>
          {!isChanged && gettext('Saved')}
          {isChanged && saveStatus === SAVE_STATUS.NONE && gettext('Save')}
          {saveStatus === SAVE_STATUS.SAVING && (
            <>
              <Loading className="mr-2" />
              <span>{gettext('Saving')}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

WorkflowToolbar.propTypes = {
  selectedWorkflow: PropTypes.object,
  isSidePanelFolded: PropTypes.bool,
  onToggleSidePanelFolded: PropTypes.func,
};

export default WorkflowToolbar;
