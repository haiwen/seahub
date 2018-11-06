import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  uploadFile: PropTypes.object.isRequired,
};

class FileUploaderListItem extends React.Component {

  onItemDelete = () => {

  }

  render() {
    return (
      <tr className="file-upload-item">
        <td width="50%" className="upload-name ellipsis">{this.props.uploadFile.fileName}</td>
        <td width="30%" className="upload-progress">progress</td>
        <td width="20%" className="upload-operation">cancel</td>
      </tr>
    );
  }
}

FileUploaderListItem.propTypes = propTypes;

export default FileUploaderListItem;
