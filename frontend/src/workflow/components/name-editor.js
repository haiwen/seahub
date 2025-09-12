import { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';

const WorkflowNameEditor = ({ initialName, onCancel, saveName }) => {
  const [name, setName] = useState(initialName || '');
  const inputRef = useRef(null);

  const onChange = useCallback((event) => {
    setName(event.target.value);
  }, []);

  const onSave = useCallback(() => {
    saveName(name);
  }, [name, saveName]);

  const onBlur = useCallback(() => {
    onSave();
  }, [onSave]);

  const onKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      onSave();
    } else if (event.key === 'Escape') {
      onCancel();
    }
  }, [onSave, onCancel]);

  const onClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  return (
    <Input
      className="workflow-name-editor"
      ref={inputRef}
      autoFocus
      value={name}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onClick={onClick}
    />
  );
};

WorkflowNameEditor.propTypes = {
  initialName: PropTypes.string,
  onCancel: PropTypes.func,
  saveName: PropTypes.func,
};

export default WorkflowNameEditor;
