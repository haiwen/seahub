import moment from 'moment';
import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem} from 'reactstrap';
import { gettext, filePath } from '../../utils/constants';
import URLDecorator from '../../utils/url-decorator';
import Rename from '../../components/rename';

import '../../css/history-record-item.css';

moment.locale(window.app.config.lang);

class HistoryVersion extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowOperationIcon: false,
      isMenuShow: false,
      isRenameShow: false,
    };
  }

  onMouseEnter = () => {
    const { currentVersion, historyVersion } = this.props;
    if (currentVersion.commit_id === historyVersion.commit_id) return;
    this.setState({ isShowOperationIcon: true });
  }

  onMouseLeave = () => {
    const { currentVersion, historyVersion } = this.props;
    if (currentVersion.commit_id === historyVersion.commit_id) return;
    this.setState({ isShowOperationIcon: false });
  }

  onToggleClick = (e) => {
    this.setState({ isMenuShow: !this.state.isMenuShow });
  }

  onClick = () => {
    this.setState({ isShowOperationIcon: false });
    const { currentVersion, historyVersion } = this.props;
    if (currentVersion.commit_id === historyVersion.commit_id) return;
    this.props.onSelectHistoryVersion(historyVersion);
  }

  onRestore = () => {
    const { historyVersion } = this.props;
    this.props.onRestore(historyVersion);
  }

  onItemDownload = () => {
    // nothing todo
  }

  onItemCopy = () => {
    const { historyVersion } = this.props;
    historyVersion.ctime_format = moment(historyVersion.ctime).format('YYYY-MM-DD HH:mm');
    this.props.onCopy(historyVersion);
  }

  toggleRename = () => {
    this.setState({isRenameShow: !this.state.isRenameShow});
  }

  onRenameConfirm = (newName) => {
    const { obj_id } = this.props.historyVersion;
    this.props.renameHistoryVersion(obj_id, newName);
    this.toggleRename();
  }

  onRenameCancel = () => {
    this.toggleRename();
  }

  render() {
    const { currentVersion, historyVersion } = this.props;
    if (!currentVersion || !historyVersion) return null;
    const { ctime, commit_id, creator_name, obj_id, name} = historyVersion;
    const isHighlightItem = commit_id === currentVersion.commit_id;
    const url = URLDecorator.getUrl({ type: 'download_historic_file', filePath: filePath, objID: obj_id });
    return (
      <li
        className={`history-list-item ${isHighlightItem ? 'item-active' : ''}`}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onClick={this.onClick}
      >
        <div className="history-info">
          {this.state.isRenameShow ?
            <Rename name={name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel}/>
            :<div className="name">{name}</div>
          }
          <div className="time">{moment(ctime).format('YYYY-MM-DD HH:mm')}</div>
          <div className="owner">
            <span className="squire-icon"></span>
            <span>{creator_name}</span>
          </div>
        </div>
        <div className="history-operation">
          <Dropdown isOpen={this.state.isMenuShow} toggle={this.onToggleClick}>
            <DropdownToggle
              tag='a'
              className={`fas fa-ellipsis-v ${(this.state.isShowOperationIcon || isHighlightItem) ? '' : 'invisible'}`}
              data-toggle="dropdown"
              aria-expanded={this.state.isMenuShow}
              alt={gettext('More Operations')}
            />
            <DropdownMenu>
              {/* {(this.props.index !== 0) && <DropdownItem onClick={this.onItemRestore}>{gettext('Restore')}</DropdownItem>} */}
              <DropdownItem tag='a' href={url} onClick={this.onItemDownLoad}>{gettext('Download')}</DropdownItem>
              {(this.props.index !== 0) && <DropdownItem onClick={this.onItemCopy}>{gettext('Copy')}</DropdownItem>}
              <DropdownItem onClick={this.toggleRename}>{gettext('Rename')}</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </li>
    );
  }
}

HistoryVersion.propTypes = {
  index: PropTypes.number,
  currentVersion: PropTypes.object.isRequired,
  historyVersion: PropTypes.object,
  onSelectHistoryVersion: PropTypes.func.isRequired,
  onRestore: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  renameHistoryVersion: PropTypes.func.isRequired,
};

export default HistoryVersion;
