import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { DEFAULT_WIKI_COLOR, resolveWikiIcon } from './constants';

import './wiki-icon.css';

const getColorWithOpacity = (color, opacity) => {
  const normalizedColor = /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_WIKI_COLOR;
  const red = parseInt(normalizedColor.slice(1, 3), 16);
  const green = parseInt(normalizedColor.slice(3, 5), 16);
  const blue = parseInt(normalizedColor.slice(5, 7), 16);
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
  const resolvedColor = /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_WIKI_COLOR;

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
