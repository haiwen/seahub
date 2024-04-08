import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext } from '../../../utils/constants';
import { InternalLinkOperation } from '../../../components/operations';

const { repoID, filePath } = window.app.pageOptions;

class FileInfo extends React.PureComponent {

  render() {
    const { fileInfo, isPro, isLocked, mediaUrl } = this.props;
    const starTitle = fileInfo.starred ? gettext('starred') : gettext('unstarred');
    const starIconClass = `iconfont ${fileInfo.starred ? 'icon-star1 star' : 'icon-star2'}`;
    const modifyTime = moment(fileInfo.mtime * 1000).format('YYYY-MM-DD HH:mm');

    const lockedText = gettext('locked');
    return (
      <div className="topbar-file-info text-truncate ml-0 mr-4">
        <div className="file-title">
          <span className='file-name text-truncate'>{fileInfo.name}</span>
          <span className="file-star" title={starTitle}>
            <i className={starIconClass} onClick={this.props.toggleStar}/>
          </span>
          <InternalLinkOperation path={filePath} repoID={repoID} />
          {(isPro && isLocked) && (
            <img
              className="file-locked-icon mx-2"
              width="16"
              src={`${mediaUrl}img/file-locked-32.png`}
              alt={lockedText}
              title={lockedText}
              aria-label={lockedText}
            />
          )}
        </div>
        <div className="file-state">
          <span className={'file-modifier-name'}>{fileInfo.lastModifier}</span>
          <span className={'file-modifier-time'}>{modifyTime}</span>
        </div>
      </div>
    );
  }
}

FileInfo.propTypes = {
  fileInfo: PropTypes.object,
  isPro: PropTypes.bool,
  isLocked: PropTypes.bool,
  mediaUrl: PropTypes.string,
  toggleStar: PropTypes.func,
};

export default FileInfo;
