import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Button, Label } from 'reactstrap';
import { gettext } from '../../../utils/constants';

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

  uploadFile = (e) => {
    // no file selected
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
    let { helpTip, filePath, fileWidth, fileHeight, displayName } = this.props;
    return (
      <Fragment>
        <Row>
          <Col xs="3">
            <Label className="font-weight-bold">{displayName}</Label>
          </Col>
          <Col xs="4">
            {/* This will append the current timestamp automatically when render this component, 
            and it will make the browser look again for the image instead of retrieving the one in the cache. */}
            <img src={filePath + '?t=' + new Date().getTime()} alt="" width={fileWidth} height={fileHeight}/>
            <p>{helpTip}</p>
          </Col>
          <Col xs="4">
            <Button color="primary" onClick={this.openFileInput}>{gettext('Change')}</Button>
            <input className="d-none" type="file" onChange={this.uploadFile} ref={this.fileInput} />
          </Col>
        </Row>
      </Fragment>
    );
  }
}

WebSettingFile.propTypes = propTypes;

export default WebSettingFile;