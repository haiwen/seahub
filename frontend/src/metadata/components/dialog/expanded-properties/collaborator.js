import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { getCellValueByColumn } from '../../../utils/cell';
import AsyncCollaborator from '../../cell-formatter/async-collaborator';
import { useCollaborators } from '../../../hooks';
import CollaboratorEditor from '../../cell-editors/collaborator-editor';
import ClickOutside from '../../../../components/click-outside';

const Collaborator = ({ record, column, columns, onCommit }) => {
  const [isEditorShow, setIsEditorShow] = useState(false);
  const { collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser } = useCollaborators();
  const value = useMemo(() => getCellValueByColumn(record, column), [record, column]);
  const props = useMemo(() => ({
    collaborators,
    collaboratorsCache,
    updateCollaboratorsCache,
    api: queryUser,
  }), [collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser]);

  const onEdit = useCallback(() => {
    setIsEditorShow(true);
  }, []);

  const onClickOutside = useCallback(() => {
    setIsEditorShow(false);
  }, []);

  const onChange = useCallback((emails) => {
    onCommit(column, emails);
  }, [column, onCommit]);

  return (
    <ClickOutside onClickOutside={onClickOutside}>
      <div className="form-control position-relative select-option-container" onClick={onEdit}>
        {Array.isArray(value) && value.length > 0 && (
          value.map(email => <AsyncCollaborator key={email} value={email} {...props} />)
        )}
        <i className="sf3-font sf3-font-down dropdown-indicator" aria-hidden="true"></i>
        {isEditorShow && (
          <CollaboratorEditor
            value={value}
            column={column}
            saveImmediately={true}
            onCommit={onChange}
          />
        )}
      </div>
    </ClickOutside>
  );
};

Collaborator.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
  onCommit: PropTypes.func.isRequired,
};

export default Collaborator;
