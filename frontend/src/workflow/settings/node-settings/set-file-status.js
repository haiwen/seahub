import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Label } from 'reactstrap';
import toaster from '../../../components/toast';
import SingleSelectEditor from '../../../metadata/components/detail-editor/single-select-editor';
import { gettext } from '../../../utils/constants';
import { metadataAPI } from '../../../metadata';
import { useWorkflows } from '../../hooks/workflows';
import { useWorkflow } from '../../hooks/workflow';
import { PRIVATE_COLUMN_KEY } from '../../../metadata/constants';
import { Utils } from '../../../utils/utils';
import Column from '../../../metadata/model/column';
import { getColumnOptionNameById } from '../../../metadata/utils/cell';

const WorkflowActionSetFileStatusSettings = ({ editingNode }) => {
  const { repoID } = useWorkflows();
  const { editingNodeId, modifyNodeParams } = useWorkflow();
  const [selectedStatus, setSelectedStatus] = useState(editingNode?.data.params?.status || '');
  const [fileStatusColumn, setFileStatusColumn] = useState(null);

  const modifyFileStatus = useCallback((status) => {
    const optionName = getColumnOptionNameById(fileStatusColumn, status) || '';
    setSelectedStatus(optionName);
    modifyNodeParams(editingNodeId, { status: optionName });
  }, [modifyNodeParams, editingNodeId, fileStatusColumn]);

  useEffect(() => {
    metadataAPI.getColumnInfo(repoID).then((res) => {
      const columns = res.data.columns || [];
      let fileStatusColumn = columns.find(column => column.key === PRIVATE_COLUMN_KEY.FILE_STATUS);
      if (fileStatusColumn) {
        fileStatusColumn = new Column(fileStatusColumn);
        setFileStatusColumn(fileStatusColumn);
      }
    }).catch((error) => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID]);

  return (
    <div className="workflow-action-set-file-status-settings">
      <div className="workflow-node-setting">
        <Label>{gettext('File status')}</Label>
        <SingleSelectEditor
          field={fileStatusColumn || {}}
          value={selectedStatus}
          record={{}}
          fields={[]}
          modifyColumnData={() => { }}
          onChange={modifyFileStatus}
        />
      </div>
    </div>
  );
};

WorkflowActionSetFileStatusSettings.propTypes = {
  editingNode: PropTypes.object,
};


export default WorkflowActionSetFileStatusSettings;
