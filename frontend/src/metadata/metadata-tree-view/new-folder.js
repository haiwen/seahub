import React, { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import toaster from '../../components/toast';
import InlineNameEditor from './inline-name-editor';
import { validateName } from '../utils/validate';
import { useMetadata } from '../hooks';
import { VIEWS_TYPE_FOLDER } from '../constants';
import Icon from '../../components/icon';

const NewFolder = ({ closeNewFolder }) => {
  const { navigation, addFolder } = useMetadata();

  const editorRef = useRef(null);

  const getFoldersNames = useCallback(() => {
    return navigation.filter((nav) => nav.type === VIEWS_TYPE_FOLDER)
      .map((folder) => folder.name);
  }, [navigation]);

  const handleInputSubmit = useCallback((name) => {
    const foldersNames = getFoldersNames();
    const { isValid, message } = validateName(name, foldersNames);
    if (!isValid) {
      toaster.danger(message);
      const { inputRef } = editorRef.current || {};
      inputRef.current && inputRef.current.focus();
      return;
    }
    addFolder({ name: message, successCallback: closeNewFolder });
  }, [addFolder, getFoldersNames, closeNewFolder]);

  return (
    <div className="tree-node">
      <div className="tree-node-inner tree-view-inner sf-metadata-view-form">
        <div className="tree-node-text">
          <InlineNameEditor
            ref={editorRef}
            onSubmit={handleInputSubmit}
          />
        </div>
        <div className="left-icon">
          <span className="folder-toggle-icon">
            <Icon symbol="down" />
          </span>
          <span className="tree-node-icon">
            <Icon symbol="folder" />
          </span>
        </div>
      </div>
    </div>
  );
};

NewFolder.propTypes = {
  closeNewView: PropTypes.func,
};

export default NewFolder;
