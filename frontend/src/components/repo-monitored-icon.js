import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext } from '../utils/constants';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  className: PropTypes.string
};

class RepoMonitoredIcon extends React.Component {

  render() {
    const { repoID, className } = this.props;
    return (
      <Fragment>
        <i id={`watching-${repoID}`} className={`sf3-font-monitor sf3-font ${className ? className : ''}`}></i>
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
