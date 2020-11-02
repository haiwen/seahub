import React, { Component, Fragment } from 'react';
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

class WebSettingFile extends Component {

  constructor(props) {
    super(props);
    this.fileInput = React.createRef();
  }

  uploadFile = () => {
    if (!this.fileInput.current.files.length) {
      return;
    }
    const file = this.fileInput.current.files[0];
    this.props.postFile(file, this.props.keyText);
  }

  openFileInput = () => {
    this.fileInput.current.click();
  }

  render() {
    const { helpTip, filePath, fileWidth, fileHeight, displayName } = this.props;
    return (
      <SettingItemBase
        displayName={displayName}
        helpTip={helpTip}
        mainContent={
          <img src={filePath + '?t=' + new Date().getTime()} alt={displayName} width={fileWidth} height={fileHeight} className="mb-1" />
        }
        extraContent={
          <Fragment>
            <Button color="secondary" onClick={this.openFileInput}>{gettext('Change')}</Button>
            <input className="d-none" type="file" onChange={this.uploadFile} ref={this.fileInput} />
          </Fragment>
        }
      />
    );
  }
}

WebSettingFile.propTypes = propTypes;

export default WebSettingFile;
