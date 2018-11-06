import React from 'react';
import PropTypes from 'prop-types';
import FileUploaderListItem from './file-uploader-list-item';
import '../../css/upload-view.css';

const propTypes = {
  uploadFileList: PropTypes.array.isRequired, 
};

class FileUploaderListView extends React.Component {

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
                    <FileUploaderListItem key={index} uploadFile={uploadFile}/>
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

FileUploaderListView.propTypes = propTypes;

export default FileUploaderListView;
