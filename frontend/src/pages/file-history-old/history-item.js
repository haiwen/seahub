import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, filePath, historyRepoID, isVirtualRepo } from '../../utils/constants';
import URLDecorator from '../../utils/url-decorator';
import CustomDropdown from '../../components/dropdown';

dayjs.locale(window.app.config.lang);

const propTypes = {
  item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  canDownload: PropTypes.bool.isRequired,
  onItemRestore: PropTypes.func.isRequired,
};

class HistoryItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      active: false,
    };
  }

  onMouseEnter = () => {
    this.setState({
      active: true
    });
  };

  onMouseLeave = () => {
    this.setState({
      active: false
    });
  };

  onItemRestore = (e) => {
    e.preventDefault();
    this.props.onItemRestore(this.props.item);
  };

  render() {
    let item = this.props.item;
    return (
      <tr
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        className={this.state.active ? 'tr-highlight' : ''}
      >
        <td>
          <span>{dayjs(item.ctime).format('YYYY-MM-DD HH:mm:ss')}</span>
          {this.props.index === 0 && <span className="ml-1">{gettext('(current version)')}</span>}
        </td>
        <td>
          <img className="avatar mr-1" src={item.creator_avatar_url} alt='' />
          <a
            href={`${siteRoot}profile/${encodeURIComponent(item.creator_email)}/`}
            target='_blank'
            className="username"
            rel="noreferrer"
          >
            {item.creator_name}
          </a>
        </td>
        <td>{Utils.bytesToSize(item.size)}</td>
        <td>
          <MoreMenu
            index={this.props.index}
            downloadUrl={URLDecorator.getUrl({ type: 'download_historic_file', filePath: filePath, objID: item.rev_file_id })}
            viewUrl={`${siteRoot}repo/${historyRepoID}/history/files/?obj_id=${item.rev_file_id}&commit_id=${item.commit_id}&p=${Utils.encodePath(filePath)}`}
            snapshotURL={`${siteRoot}repo/${historyRepoID}/snapshot/?commit_id=${item.commit_id}`}
            onItemRestore={this.onItemRestore}
            canDownload={this.props.canDownload}
            className={this.state.active ? '' : 'invisible'}
          />
        </td>
      </tr>
    );
  }
}

HistoryItem.propTypes = propTypes;


const MoreMenuPropTypes = {
  index: PropTypes.number.isRequired,
  downloadUrl: PropTypes.string.isRequired,
  viewUrl: PropTypes.string.isRequired,
  onItemRestore: PropTypes.func.isRequired,
  canDownload: PropTypes.bool.isRequired,
  snapshotURL: PropTypes.string.isRequired,
  className: PropTypes.string.isRequired,
};

class MoreMenu extends React.PureComponent {

  getMenuItems = () => {
    const { index, downloadUrl, viewUrl, snapshotURL, onItemRestore, canDownload } = this.props;
    const items = [];
    if (index !== 0) {
      items.push({ key: 'restore', label: gettext('Restore'), onClick: onItemRestore });
    }
    if (canDownload) {
      items.push({ key: 'download', label: gettext('Download'), onClick: () => { window.location = downloadUrl; } });
    }
    items.push({ key: 'view', label: gettext('View'), onClick: () => { window.location = viewUrl; } });
    if (index != 0 && !isVirtualRepo) {
      items.push({ key: 'snapshot', label: gettext('View Related Snapshot'), onClick: () => { window.open(snapshotURL, '_blank'); } });
    }
    return items;
  };

  render() {
    const { className } = this.props;
    return (
      <CustomDropdown
        items={this.getMenuItems()}
        className={`mx-1 old-history-more-operation ${className}`}
        triggerClassName="op-icon"
        menuClassName="drop-list"
      />
    );
  }
}

MoreMenu.propTypes = MoreMenuPropTypes;

export default HistoryItem;
