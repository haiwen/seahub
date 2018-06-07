import React from 'react';
import dayjs from 'dayjs';

class FileInfor extends React.Component {
  render() {

    let modifyTime = dayjs(this.props.fileInfo.mtime*1000).format("YYYY-MM-DD HH:mm");
    return (
      <div className="topbar-file-info">
        <div className="file-name">
          {this.props.fileInfo.name}
        </div>
        <div className="file-mtime">
          {modifyTime}
        </div>
      </div>
    )
  }
}

export default FileInfor