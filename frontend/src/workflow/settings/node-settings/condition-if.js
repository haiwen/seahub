import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Label } from 'reactstrap';
import FileSuffixSelector from './file-suffix-selector';
import { gettext } from '../../../utils/constants';
import { FILTER_PREDICATE_TYPE, PRIVATE_COLUMN_KEY } from '../../../metadata/constants';
import { useWorkflow } from '../../hooks/workflow';

const WorkflowConditionIfSettings = ({ editingNode }) => {
  const { editingNodeId, modifyNodeParams } = useWorkflow();
  const [basicFilters, setBasicFilters] = useState(editingNode?.data?.params?.basic_filters || []);

  const fileSuffixFilter = useMemo(() => basicFilters.find(filter => filter.column_key === PRIVATE_COLUMN_KEY.SUFFIX), [basicFilters]);

  const modifyFileSuffixFilter = useCallback((fileSuffixes) => {
    if (!fileSuffixFilter && fileSuffixes.length === 0) return;
    let newBasicFilters = [...basicFilters];
    if (fileSuffixFilter) {
      const updatedFilterIndex = basicFilters.indexOf(fileSuffixFilter);
      newBasicFilters[updatedFilterIndex].filter_term = fileSuffixes;
    } else {
      // new file suffix filter
      newBasicFilters.push({ column_key: PRIVATE_COLUMN_KEY.SUFFIX, filter_predicate: FILTER_PREDICATE_TYPE.IS_ANY_OF, filter_term: fileSuffixes });
    }
    setBasicFilters(newBasicFilters);
    modifyNodeParams(editingNodeId, { basic_filters: newBasicFilters });
  }, [modifyNodeParams, editingNodeId, basicFilters, fileSuffixFilter]);

  return (
    <div className="workflow-condition-if-settings">
      <div className="workflow-node-setting">
        <Label>{gettext('Basic conditions')}</Label>
        <FileSuffixSelector value={fileSuffixFilter?.filter_term} modifyFileSuffixes={modifyFileSuffixFilter} />
      </div>
    </div>
  );
};

WorkflowConditionIfSettings.propTypes = {
  editingNode: PropTypes.object,
};

export default WorkflowConditionIfSettings;
