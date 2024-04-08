import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { UncontrolledTooltip } from 'reactstrap';

export default class FileTag extends React.PureComponent {

  static propTypes = {
    fileTag: PropTypes.object.isRequired,
    length: PropTypes.number.isRequired,
    index: PropTypes.number.isRequired,
  };

  render() {
    const { fileTag, length, index } = this.props;
    const fileTagID = `file-tag-${fileTag.id}-${uuidv4()}`;
    return (
      <>
        <span
          className="file-tag"
          id={fileTagID}
          key={fileTag.id}
          style={{zIndex:length - index, backgroundColor:fileTag.color}}
        ></span>
        <UncontrolledTooltip target={fileTagID} placement="bottom">
          {fileTag.name}
        </UncontrolledTooltip>
      </>
    );
  }
}
