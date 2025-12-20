import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import Icon from '../../icon';

const propTypes = {
  repo: PropTypes.object.isRequired,
  updateRepoInfo: PropTypes.func.isRequired
};

class WatchUnwatchFileChanges extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
    };
  }

  watchFileChanges = () => {
    const { repo } = this.props;
    seafileAPI.monitorRepo(repo.repo_id).then(() => {
      this.props.updateRepoInfo({ 'monitored': true });
      const message = gettext('Successfully watched the library.');
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  unwatchFileChanges = () => {
    const { repo } = this.props;
    seafileAPI.unMonitorRepo(repo.repo_id).then(() => {
      this.props.updateRepoInfo({ 'monitored': false });
      const message = gettext('Successfully unwatched the library.');
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { repo } = this.props;
    const { monitored } = repo;

    const monitorText = monitored ? gettext('Unwatch File Changes') : gettext('Watch File Changes');
    const clickHandler = monitored ? this.unwatchFileChanges : this.watchFileChanges;

    return (
      <div
        role="button"
        tabIndex="0"
        className='dir-others-item text-nowrap'
        title={monitorText}
        onClick={clickHandler}
        onKeyDown={Utils.onKeyDown}
      >
        <span className="d-flex align-items-center">
          {monitored ? (
            <Icon symbol="monitor-on" />
          ) : (
            <Icon symbol="monitor-off" />
          )}
        </span>
        <span className="dir-others-item-text">{monitorText}</span>
      </div>
    );
  }
}

WatchUnwatchFileChanges.propTypes = propTypes;

export default WatchUnwatchFileChanges;
