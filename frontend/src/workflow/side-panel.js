import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import WorkflowNavigation from './navigation';
import AddWorkflowDropdownMenu from './components/add-workflow-dropdown-menu';
import SaveWorkflowTipsDialog from './components/save-workflow-tips-dialog';
import { useWorkflow } from './hooks/workflow';
import { gettext } from '../utils/constants';

const SidePanel = ({ sidePanelDOMRef }) => {
  const { isChanged } = useWorkflow();
  const [isShowAddWorkflowDropdown, setIsShowAddRuleDropdown] = useState(false);
  const [isShowNewFolderEditor, setIsShowNewFolderEditor] = useState(false);
  const [isShowNewWorkflowEditor, setIsShowNewWorkflowEditor] = useState(false);
  const [isShowSaveTips, setIsShowSaveTips] = useState(false);

  const onToggleAddWorkflowDropdown = useCallback(() => {
    if (isShowNewWorkflowEditor || isShowNewFolderEditor) return;
    setIsShowAddRuleDropdown(!isShowAddWorkflowDropdown);
  }, [isShowAddWorkflowDropdown, isShowNewWorkflowEditor, isShowNewFolderEditor]);

  const onToggleAddFolder = useCallback(() => {
    setIsShowNewFolderEditor(!isShowNewFolderEditor);
  }, [isShowNewFolderEditor]);

  const onToggleAddWorkflow = useCallback(() => {
    if (isChanged) {
      setIsShowSaveTips(true);
      return;
    }
    setIsShowNewWorkflowEditor(!isShowNewWorkflowEditor);
  }, [isShowNewWorkflowEditor, isChanged]);

  const closeNewFolderEditor = useCallback(() => setIsShowNewFolderEditor(false), []);

  const closeNewWorkflowEditor = useCallback(() => setIsShowNewWorkflowEditor(false), []);

  const leaveSaveTipsCallback = useCallback(() => {
    setIsShowNewWorkflowEditor(true);
    setIsShowSaveTips(false);
  }, []);

  return (
    <div className="side-panel left-zero" ref={sidePanelDOMRef}>
      <div className="side-panel-header">{gettext('Workflow')}</div>
      <div className="side-panel-center">
        <div className="side-nav">
          <div className="side-nav-con d-flex flex-column">
            <WorkflowNavigation
              isShowNewFolderEditor={isShowNewFolderEditor}
              isShowNewWorkflowEditor={isShowNewWorkflowEditor}
              closeNewFolderEditor={closeNewFolderEditor}
              closeNewWorkflowEditor={closeNewWorkflowEditor}
            />
          </div>
        </div>
      </div>
      <div className="side-panel-footer">
        <div className="add-workflow-wrapper">
          {/* replace onToggleAddWorkflow by onToggleAddWorkflowDropdown if support folder */}
          <Button color='primary' className='add-workflow-btn' onClick={onToggleAddWorkflow}>{gettext('Add workflow')}</Button>
          {isShowAddWorkflowDropdown && (
            <AddWorkflowDropdownMenu
              onToggleAddWorkflowDropdown={onToggleAddWorkflowDropdown}
              onToggleAddFolder={onToggleAddFolder}
              onToggleAddWorkflow={onToggleAddWorkflow}
            />
          )}
        </div>
      </div>
      {isShowSaveTips && (
        <SaveWorkflowTipsDialog
          saveCallback={() => setIsShowNewWorkflowEditor(true)}
          leaveCallback={leaveSaveTipsCallback}
          toggle={() => setIsShowSaveTips(false)}
        />
      )}
    </div>
  );
};

SidePanel.propTypes = {
  sidePanelDOMRef: PropTypes.object,
};

export default SidePanel;
