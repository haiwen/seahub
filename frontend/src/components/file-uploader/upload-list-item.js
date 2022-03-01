import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  resumableFile: PropTypes.object.isRequired,
  onUploadCancel: PropTypes.func.isRequired,
  onUploadRetry: PropTypes.func.isRequired,
};

const UPLOAD_UPLOADING = 'uploading';
const UPLOAD_ERROR = 'error';
const UPLOAD_ISSAVING = 'isSaving';
const UPLOAD_UPLOADED = 'uploaded';

class UploadListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      uploadState: UPLOAD_UPLOADING
    };
  }

  componentWillReceiveProps(nextProps) {
    let { resumableFile } = nextProps;
    let uploadState = UPLOAD_UPLOADING;

    if (resumableFile.error) {
      uploadState = UPLOAD_ERROR;
    } else {
      if (resumableFile.remainingTime === 0 && !resumableFile.isSaved) {
        uploadState = UPLOAD_ISSAVING;
      }

      if (resumableFile.isSaved) {
        uploadState = UPLOAD_UPLOADED;
      }
    }

    this.setState({uploadState: uploadState});
  }

  onUploadCancel = (e) => {
    e.preventDefault();
    this.props.onUploadCancel(this.props.resumableFile);
  }

  onUploadRetry = (e) => {
    e.preventDefault();
    this.props.onUploadRetry(this.props.resumableFile);
  }

  formatFileSize = (size) => {
    if (typeof size !== 'number') {
      return '';
    }
    if (size >= 1000 * 1000 * 1000) {
      return (size / (1000 * 1000 * 1000)).toFixed(1) + ' G';
    }
    if (size >= 1000 * 1000) {
      return (size / (1000 * 1000)).toFixed(1) + ' M';
    }
    if (size >= 1000) {
      return (size / 1000).toFixed(1) + ' K';
    }
    return size.toFixed(1) + ' B';
  }

  render() {
    let { resumableFile } = this.props;
    let progress = Math.round(resumableFile.progress() * 100);
    let error = resumableFile.error;

    const fileName = resumableFile.newFileName;
    const size = this.formatFileSize(resumableFile.size);

    return (
      <tr className="file-upload-item">
        <td className="upload-name">
          <div className="ellipsis" title={fileName}>{fileName}</div>
        </td>
        <td className="ellipsis">
          <span className="file-size" title={size}>{size}</span>
        </td>
        <td className="upload-progress ellipsis">
          {(this.state.uploadState === UPLOAD_UPLOADING || this.state.uploadState === UPLOAD_ISSAVING) &&
            <Fragment>
              {resumableFile.size >= (100 * 1000 * 1000) &&
                <Fragment>
                  {resumableFile.isUploading() && (
                    <div className="progress-container">
                      <div className="progress">
                        <div className="progress-bar" role="progressbar" style={{width: `${progress}%`}} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"></div>
                      </div>
                      {(resumableFile.remainingTime === -1) && <div className="progress-text">{gettext('Preparing to upload...')}</div>}
                      {(resumableFile.remainingTime > 0) && <div className="progress-text">{gettext('Remaining')}{' '}{Utils.formatTime(resumableFile.remainingTime)}</div>}
                      {(resumableFile.remainingTime === 0) && <div className="progress-text">{gettext('Indexing...')}</div>}
                    </div>
                  )}
                  {!resumableFile.isUploading() && (
                    <div className="progress-container d-flex align-items-center">
                      <div className="progress">
                        <div className="progress-bar" role="progressbar" style={{width: `${progress}%`}} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"></div>
                      </div>
                    </div>
                  )}
                </Fragment>
              }
              {(resumableFile.size < (100 * 1000 * 1000)) &&
                <div className="progress-container d-flex align-items-center">
                  <div className="progress">
                    <div className="progress-bar" role="progressbar" style={{width: `${progress}%`}} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"></div>
                  </div>
                </div>
              }
            </Fragment>
          }
          {this.state.uploadState === UPLOAD_ERROR && (
            <div className="message err-message ml-0" dangerouslySetInnerHTML={{__html: error}}></div>
          )}
        </td>
        <td className="upload-operation ellipsis">
          <Fragment>
            {this.state.uploadState === UPLOAD_UPLOADING && (
              <a href="#" onClick={this.onUploadCancel}>{gettext('Cancel')}</a>
            )}
            {this.state.uploadState === UPLOAD_ERROR && (
              <a href="#" onClick={this.onUploadRetry}>{gettext('Retry')}</a>
            )}
            {this.state.uploadState === UPLOAD_ISSAVING && (
              <span className="saving">{gettext('Saving...')}</span>
            )}
            {this.state.uploadState === UPLOAD_UPLOADED && (
              <span className="uploaded">{gettext('Uploaded')}</span>
            )}
          </Fragment>
        </td>
      </tr>
    );
  }
}

UploadListItem.propTypes = propTypes;

export default UploadListItem;
