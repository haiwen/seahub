import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { resolveWikiColor, resolveWikiIcon } from './wiki-card-utils';

import './wiki-icon.css';

const getColorWithOpacity = (color, opacity) => {
  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

const WikiIconGlyph = ({ icon, className }) => {
  const resolvedIcon = resolveWikiIcon(icon);

  return (
    <i
      className={classNames(
        'haiwen-iconfont',
        'wiki-icon-glyph',
        `haiwen-${resolvedIcon}`,
        className
      )}
      aria-hidden="true"
    />
  );
};

const WikiIcon = ({ icon, color, className }) => {
  const resolvedIcon = resolveWikiIcon(icon);
  const resolvedColor = resolveWikiColor(color);

  return (
    <span
      className={classNames('wiki-icon', className)}
      style={{
        backgroundColor: getColorWithOpacity(resolvedColor, 0.1),
        color: resolvedColor,
      }}
    >
      <WikiIconGlyph icon={resolvedIcon} />
    </span>
  );
};

WikiIconGlyph.propTypes = {
  icon: PropTypes.string,
  className: PropTypes.string,
};

WikiIcon.propTypes = {
  icon: PropTypes.string,
  color: PropTypes.string,
  className: PropTypes.string,
};

export { WikiIconGlyph };
export default WikiIcon;
