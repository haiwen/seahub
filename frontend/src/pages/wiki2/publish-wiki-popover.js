import React from 'react';
import PropTypes from 'prop-types';
import { PopoverHeader } from 'reactstrap';
import CustomizePopover from '../../components/customize-popover';
import Icon from '../../components/icon';
import PublishWikiContent, { DEFAULT_URL } from '../../components/publish-wiki-content';
import { gettext } from '../../utils/constants';

const propTypes = {
  target: PropTypes.string.isRequired,
  hidePopover: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired,
  onUnpublish: PropTypes.func.isRequired,
  customUrlString: PropTypes.string,
  enableServerRender: PropTypes.bool,
};

const PublishWikiPopover = ({ target, hidePopover, onPublish, onUnpublish, customUrlString, enableServerRender }) => {
  const isPublished = customUrlString !== '';
  return (
    <CustomizePopover
      target={target}
      placement="right-start"
      popoverClassName="publish-wiki-popover"
      boundariesElement={document.body}
      modifiers={[{
        name: 'offset',
        options: { offset: [0, 0] },
      }]}
      hidePopover={hidePopover}
      hidePopoverWithEsc={hidePopover}
    >
      {isPublished &&
        <PopoverHeader tag="div" className="publish-wiki-popover-header">
          <span>{gettext('Page published')}</span>
          <a
            className="publish-wiki-view"
            href={DEFAULT_URL + customUrlString}
            target="_blank"
            rel="noreferrer"
          >
            <span>{gettext('View')}</span>
            <Icon symbol="arrow-right-b" className="publish-wiki-view-icon" />
          </a>
        </PopoverHeader>
      }
      <PublishWikiContent
        displayType="popover"
        onPublish={onPublish}
        onUnpublish={onUnpublish}
        customUrlString={customUrlString}
        enableServerRender={enableServerRender}
      />
    </CustomizePopover>
  );
};

PublishWikiPopover.propTypes = propTypes;

export default PublishWikiPopover;
