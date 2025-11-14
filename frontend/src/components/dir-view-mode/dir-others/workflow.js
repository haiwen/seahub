import React from 'react';
import Icon from '../../icon';
import { gettext } from '../../../utils/constants';
const DirOthersItemWorkflow = ({ siteRoot, repoID }) => {

  return (
    <div className='dir-others-item text-nowrap' title={gettext('Workflow')}>
      <a
        title={gettext('Workflow')}
        href={`${siteRoot}lib/${repoID}/workflows`}
        target='_blank'
        rel="noreferrer"
      >
        <Icon symbol="workflow" />
        <span className="dir-others-item-text text-truncate">{gettext('Workflow')}</span>
      </a>
    </div>
  );
};

export default DirOthersItemWorkflow;
