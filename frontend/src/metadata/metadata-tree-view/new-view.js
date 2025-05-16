import React, { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import toaster from '../../components/toast';
import Icon from '../../components/icon';
import InlineNameEditor from './inline-name-editor';
import { useMetadata } from '../hooks';
import { validateName } from '../utils/validate';
import { VIEW_TYPE, VIEW_TYPE_ICON } from '../constants';

const NewView = ({ newView, leftIndent, addView }) => {
  const { type: newViewType } = newView;
  const { idViewMap } = useMetadata();
  const editorRef = useRef(null);

  const handleInputSubmit = useCallback((name) => {
    const viewNames = Object.values(idViewMap).map(v => v.name);
    const { isValid, message } = validateName(name, viewNames);
    if (!isValid) {
      toaster.danger(message);
      const { inputRef } = editorRef.current || {};
      inputRef.current && inputRef.current.focus();
      return;
    }
    addView(message, newViewType);
  }, [newViewType, idViewMap, addView]);

  return (
    <div className="tree-node">
      <div className="tree-node-inner tree-view-inner sf-metadata-view-form">
        <div className="tree-node-text" style={{ paddingLeft: leftIndent }}>
          <InlineNameEditor
            ref={editorRef}
            name={newView.default_name}
            onSubmit={handleInputSubmit}
          />
        </div>
        <div className="left-icon" style={{ left: leftIndent - 40 }}>
          <span className="tree-node-icon">
            <Icon symbol={VIEW_TYPE_ICON[newViewType] || VIEW_TYPE.TABLE} className="metadata-views-icon" />
          </span>
        </div>
      </div>
    </div>
  );
};

NewView.propTypes = {
  newView: PropTypes.object,
  leftIndent: PropTypes.number,
};

export default NewView;
