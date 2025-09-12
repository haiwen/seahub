import { useCallback, useMemo, useState } from 'react';
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import toaster from '../components/toast';
import WorkflowNameEditor from './components/name-editor';
import { useWorkflows } from './hooks/workflows';
import { gettext } from '../utils/constants';
import { EVENT_BUS_TYPE } from './constants/event-bus-type';

const WorkflowToolbar = ({ selectedWorkflow, isSidePanelFolded, onToggleSidePanelFolded }) => {
  const { repoName, selectedWorkflowId, workflowEventBus, modifyWorkflow } = useWorkflows();
  const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const selectedWorkflowName = useMemo(() => selectedWorkflow?.name || '', [selectedWorkflow]);

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
    modifyWorkflow(selectedWorkflowId, { name: trimmedName }, () => {
      closeNameEditor();
    });
  }, [selectedWorkflowName, selectedWorkflowId, modifyWorkflow, closeNameEditor]);

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
        <Button color='primary' size='sm' className='save-workflow-btn' onClick={() => { }}>{gettext('Save')}</Button>
      </div>
    </div>
  );
};

export default WorkflowToolbar;
