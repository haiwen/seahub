import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import SettingItemBase from './setting-item-base';

const propTypes = {
  postFile: PropTypes.func.isRequired,
  keyText: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  helpTip: PropTypes.string.isRequired,
  fileWidth: PropTypes.number.isRequired,
  fileHeight: PropTypes.number.isRequired,
  displayName: PropTypes.string.isRequired
};

const WebSettingFile = (props) => {

  const fileInput = useRef(null);

  const uploadFile = () => {
    if (!fileInput.current.files.length) {
      return;
    }
    const file = fileInput.current.files[0];
    props.postFile(file, props.keyText);
  };

  const openFileInput = () => {
    fileInput.current.click();
  };

  const { helpTip, filePath, fileWidth, fileHeight, displayName } = props;

  return (
    <SettingItemBase
      displayName={displayName}
      helpTip={helpTip}
      mainContent={
        <img src={filePath + '?t=' + new Date().getTime()} alt={displayName} width={fileWidth} height={fileHeight} className="mb-1" />
      }
      extraContent={
        <>
          <Button color="secondary" onClick={openFileInput}>{gettext('Change')}</Button>
          <input className="d-none" type="file" onChange={uploadFile} ref={fileInput} />
        </>
      }
    />
  );
};

WebSettingFile.propTypes = propTypes;

export default WebSettingFile;
