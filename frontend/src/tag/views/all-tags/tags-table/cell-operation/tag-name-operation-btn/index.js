import React from 'react';
import PropTypes from 'prop-types';
import { UncontrolledTooltip } from 'reactstrap';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import { PRIVATE_COLUMN_KEY } from '../../../../../constants';
import { gettext } from '../../../../../../utils/constants';

import './index.css';

const TagNameOperationBtn = ({ record, setDisplayTag }) => {

  const handelClick = () => {
    setDisplayTag(record[PRIVATE_COLUMN_KEY.ID]);
  };

  return (
    <>
      <IconBtn id="sf-tag-open-tag-files" className="sf-tag-cell-operation-btn" size={20} iconName="open-file" onClick={handelClick} />
      <UncontrolledTooltip
        hideArrow
        target="sf-tag-open-tag-files"
        placement="bottom"
        fade={false}
        delay={{ show: 0, hide: 0 }}
        modifiers={{ preventOverflow: { boundariesElement: document.body } }}
      >
        {gettext('Tag related files')}
      </UncontrolledTooltip>
    </>
  );
};

TagNameOperationBtn.propTypes = {
  column: PropTypes.object,
  record: PropTypes.object,
  setDisplayTag: PropTypes.func,
};

export default TagNameOperationBtn;
