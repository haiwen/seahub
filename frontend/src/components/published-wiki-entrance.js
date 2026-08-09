import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Tooltip from './tooltip';
import { serviceURL, gettext } from '../utils/constants';

import '../css/published-wiki-entrance.css';

const propTypes = {
  wikiID: PropTypes.string.isRequired,
  customURLPart: PropTypes.string.isRequired,
  placement: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
};

class PublishedWikiEntrance extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { wikiID, customURLPart, placement } = this.props;
    return (
      <>
        <a
          id={`wiki-${wikiID}`}
          className="view-published-wiki"
          href={`${serviceURL}/wiki/publish/${customURLPart}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => { e.stopPropagation(); }}
        >
          {gettext('Published')}
        </a>
        <Tooltip target={`wiki-${wikiID}`} placement={placement}>
          {gettext('View published page')}
        </Tooltip>
      </>
    );
  }
}

PublishedWikiEntrance.propTypes = propTypes;

export default PublishedWikiEntrance;
