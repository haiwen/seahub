import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Label, Button } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  postFile: PropTypes.func.isRequired,
  displayName: PropTypes.string.isRequired,
};

class OrgSamlConfigPostFile extends Component {

  constructor(props) {
    super(props);
    this.fileInput = React.createRef();
  }

  uploadFile = () => {
    if (!this.fileInput.current.files.length) {
      return;
    }
    const file = this.fileInput.current.files[0];
    this.props.postFile(file);
  }

  openFileInput = () => {
    this.fileInput.current.click();
  }

  render() {
    const { displayName } = this.props;
    return (
      <Fragment>
        <Row className="my-4">
          <Col md="3">
            <Label className="web-setting-label">{displayName}</Label>
          </Col>
          <Col md="5">
            <Button color="secondary" onClick={this.openFileInput}>{gettext('Upload')}</Button>
            <input className="d-none" type="file" onChange={this.uploadFile} ref={this.fileInput} />
          </Col>
        </Row>
      </Fragment>
    );
  }
}

OrgSamlConfigPostFile.propTypes = propTypes;

export default OrgSamlConfigPostFile;
