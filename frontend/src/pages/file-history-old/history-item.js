import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext, siteRoot, filePath, historyRepoID } from '../../utils/constants';
import URLDecorator from '../../utils/url-decorator';

moment.locale(window.app.config.lang);

const propTypes = {
  item: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
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
  }

  onMouseLeave = () => {
    this.setState({
      active: false
    });
  }

  onItemRestore = () => {
    this.props.onItemRestore(this.props.item);
  }

  render() {
    let item = this.props.item;
    let downloadUrl = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: item.rev_file_id});
    let userProfileURL = `${siteRoot}profile/${encodeURIComponent(item.creator_email)}/`;
    let viewUrl = `${siteRoot}repo/${historyRepoID}/history/files/?obj_id=${item.rev_file_id}&commit_id=${item.commit_id}&p=${filePath}`;
    let diffUrl = `${siteRoot}repo/text_diff/${historyRepoID}/?commit=${item.commit_id}&p=${filePath}`;
    return (
      <Fragment>
        <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td>
            <time datetime={item.time} is="relative-time" title={moment(item.ctime).format('llll')}>{moment(item.ctime).fromNow()}</time>
            {this.props.index === 0 ? gettext('(current version)') : ''}
          </td>
          <td>
            <img className="avatar" src={item.creator_avatar_url}></img>{' '}
            <a href={userProfileURL} target='_blank' className="username">{item.creator_name}</a>
          </td>
          <td>{item.size}</td>
          <td>
            {this.state.active &&
              <span className="attr-action-icon">
                {this.props.index === 0 ? '' : <a href=" " onClick={this.onItemRestore}>{gettext('Restore')}</a>}
                <a href={downloadUrl}>{gettext('Download')}</a>
                <a href={viewUrl}>{gettext('View')}</a>
                <a href={diffUrl}>{gettext('Diff')}</a>
              </span>
            }
          </td>
        </tr>
      </Fragment>
    );
  }
}

HistoryItem.propTypes = propTypes;

export default HistoryItem;
