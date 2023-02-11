import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import Icon from '../components/icon';
import { gettext } from '../utils/constants';

const propTypes = {
  repoID: PropTypes.string.isRequired
};

class RepoMonitoredIcon extends React.Component {

  render() {
    const { repoID } = this.props;
    return (
      <Fragment>
        <span id={`watching-${repoID}`} className="ml-1">
          <Icon symbol='monitor' />
        </span>
        <UncontrolledTooltip
          placement="bottom"
          target={`#watching-${repoID}`}
        >
          {gettext('You are watching file changes of this library.')}
        </UncontrolledTooltip>
      </Fragment>
    );
  }
}

RepoMonitoredIcon.propTypes = propTypes;

export default RepoMonitoredIcon;
