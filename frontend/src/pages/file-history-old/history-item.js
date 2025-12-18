import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, filePath, historyRepoID } from '../../utils/constants';
import URLDecorator from '../../utils/url-decorator';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

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
          <img className="avatar" src={item.creator_avatar_url} alt=''></img>{' '}
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
          {this.state.active &&
            <MoreMenu
              index={this.props.index}
              downloadUrl={URLDecorator.getUrl({ type: 'download_historic_file', filePath: filePath, objID: item.rev_file_id })}
              viewUrl={`${siteRoot}repo/${historyRepoID}/history/files/?obj_id=${item.rev_file_id}&commit_id=${item.commit_id}&p=${Utils.encodePath(filePath)}`}
              snapshotURL={`${siteRoot}repo/${historyRepoID}/snapshot/?commit_id=${item.commit_id}`}
              onItemRestore={this.onItemRestore}
              canDownload={this.props.canDownload}
            />
          }
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
};

class MoreMenu extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false
    };
  }

  dropdownToggle = () => {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  };

  render() {
    const { index, downloadUrl, viewUrl, snapshotURL, onItemRestore, canDownload } = this.props;
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down" className="mx-1 old-history-more-operation">
        <DropdownToggle
          tag='i'
          className='sf3-font sf3-font-more op-icon'
          title={gettext('More operations')}
          aria-label={gettext('More operations')}
          data-toggle="dropdown"
          aria-expanded={this.state.dropdownOpen}
        >
        </DropdownToggle>
        <DropdownMenu className="drop-list">
          {index !== 0 && <a href="#" onClick={onItemRestore}><DropdownItem>{gettext('Restore')}</DropdownItem></a>}
          {canDownload && <a href={downloadUrl}><DropdownItem>{gettext('Download')}</DropdownItem></a>}
          <a href={viewUrl}><DropdownItem>{gettext('View')}</DropdownItem></a>
          {index != 0 && <DropdownItem tag="a" href={snapshotURL} target="_blank">{gettext('View Related Snapshot')}</DropdownItem>}
        </DropdownMenu>
      </Dropdown>
    );
  }
}

MoreMenu.propTypes = MoreMenuPropTypes;

export default HistoryItem;
