import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { serviceURL, gettext } from '../utils/constants';

import '../css/published-wiki-entrance.css';

const propTypes = {
  wikiID: PropTypes.string.isRequired,
  customURLPart: PropTypes.string.isRequired
};

class PublishedWikiExtrance extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { wikiID, customURLPart } = this.props;
    return (
      <>
        <a
          id={`wiki-${wikiID}`}
          className="view-published-wiki ml-2"
          href={`${serviceURL}/wiki/publish/${customURLPart}`}
          target="_blank"
          onClick={(e) => {e.stopPropagation();}}
        >
          {gettext('Published')}
        </a>
        <UncontrolledTooltip
          target={`wiki-${wikiID}`}
          placement="bottom"
        >
          {gettext('View published page')}
        </UncontrolledTooltip>
      </>
    );
  }
}

PublishedWikiExtrance.propTypes = propTypes;

export default PublishedWikiExtrance;
