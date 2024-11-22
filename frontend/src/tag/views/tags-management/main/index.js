import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import Tag from './tag';
import EmptyTip from '../../../../components/empty-tip';
import { getTagId } from '../../../utils/cell/core';

import './index.css';

const Main = ({ context, tags }) => {
  if (tags.length === 0) {
    return (
      <div className="w-100 h-100 d-flex align-items-center justify-content-center">
        <EmptyTip text={gettext('No tags')} />
      </div>
    );
  }

  return (
    <div className="sf-metadata-tags-table">
      <div className="sf-metadata-tags-table-header sf-metadata-tags-table-row">
        <div className="sf-metadata-tags-table-cell">{gettext('tag')}</div>
        <div className="sf-metadata-tags-table-cell">{gettext('File count')}</div>
        <div className="sf-metadata-tags-table-cell"></div>
      </div>
      {tags.map(tag => {
        const id = getTagId(tag);
        return (<Tag tag={tag} context={context} tags={tags} key={id} />);
      })}
    </div>
  );
};

Main.propTypes = {
  context: PropTypes.object,
  tags: PropTypes.array,
};

export default Main;
