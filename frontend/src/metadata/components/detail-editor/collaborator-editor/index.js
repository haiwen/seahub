import React, { useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'reactstrap';
import Editor from '../../cell-editors/collaborator-editor';
import DeleteCollaborator from '../../cell-editors/collaborator-editor/delete-collaborator';
import { gettext } from '../../../../utils/constants';
import { useCollaborators } from '../../../hooks';
import { KeyCodes } from '../../../../constants';
import { getEventClassName } from '../../../../utils/dom';

import './index.css';

const CollaboratorEditor = ({ field, value, onChange }) => {
  const ref = useRef(null);
  const [showEditor, setShowEditor] = useState(false);
  const { getCollaborator } = useCollaborators();

  const onClick = useCallback((event) => {
    if (!showEditor) return;
    if (!event.target) return;
    const className = getEventClassName(event);
    if (className.indexOf('sf-metadata-search-collaborators') > -1) return;
    const editor = document.querySelector('.sf-metadata-collaborator-editor');
    if ((editor && editor.contains(event.target)) || ref.current.contains(event.target)) return;
    setShowEditor(false);
  }, [showEditor]);

  const onHotKey = useCallback((event) => {
    if (event.keyCode === KeyCodes.Esc) {
      if (showEditor) {
        setShowEditor(false);
      }
    }
  }, [showEditor]);

  useEffect(() => {
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onHotKey, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onHotKey, true);
    };
  }, [onClick, onHotKey]);

  const openEditor = useCallback(() => {
    setShowEditor(true);
  }, []);

  const onCommit = useCallback((newValue) => {
    onChange(newValue);
  }, [onChange]);

  const deleteCollaborator = useCallback((email, event) => {
    event && event.stopPropagation();
    event && event.nativeEvent && event.nativeEvent.stopImmediatePropagation();
    const newValue = value.filter(c => c !== email);
    onChange(newValue);
  }, [value, onChange]);

  const renderEditor = useCallback(() => {
    if (!showEditor) return null;
    const { width } = ref.current.getBoundingClientRect();
    return (
      <Popover
        target={ref}
        isOpen={true}
        placement="bottom-end"
        hideArrow={true}
        fade={false}
        className="sf-metadata-property-editor-popover sf-metadata-collaborator-property-editor-popover"
        boundariesElement={document.body}
        style={{ width: Math.max(width - 2, 200) }}
      >
        <Editor
          saveImmediately={true}
          value={value}
          column={field}
          height={2}
          onCommit={onCommit}
        />
      </Popover>
    );
  }, [showEditor, onCommit, value, field]);

  const validValue = Array.isArray(value) ? value.filter(email => getCollaborator(email)) : [];

  return (
    <div
      className="sf-metadata-property-detail-editor sf-metadata-collaborator-property-detail-editor"
      placeholder={gettext('Empty')}
      ref={ref}
      onClick={openEditor}
    >
      {validValue.length > 0 && (<DeleteCollaborator value={value} onDelete={deleteCollaborator} />)}
      {renderEditor()}
    </div>
  );
};

CollaboratorEditor.propTypes = {
  field: PropTypes.object.isRequired,
  value: PropTypes.array,
  onChange: PropTypes.func.isRequired,
};

export default CollaboratorEditor;
