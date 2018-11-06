import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import FileUploadListItem from './file-upload-list-item';
import '../../css/upload-view.css';

const propTypes = {
  uploadFileList: PropTypes.array.isRequired, 
};

class FileUploadListView extends React.Component {

  render() {
    return (
      <div className="file-upload-module">
        <div className="file-upload-header">
          <div className="title">上传已完成</div>
        </div>
        <div className="file-upload-container table-container">
          <table>
            <tbody>
              {
                this.props.uploadFileList.map((uploadFile, index) => {
                  return (
                    <FileUploadListItem key={index} uploadFile={uploadFile}/>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

FileUploadListView.propTypes = propTypes;

export default FileUploadListView;
