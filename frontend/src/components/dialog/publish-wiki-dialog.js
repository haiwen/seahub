import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { Modal } from 'reactstrap';
import PublishWikiContent from '../publish-wiki-content';

const propTypes = {
  wiki: PropTypes.object,
  onPublish: PropTypes.func.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  handleCustomUrl: PropTypes.func.isRequired,
  customUrlString: PropTypes.string,
  enableServerRender: PropTypes.bool,
};

class PublishWikiDialog extends React.Component {
  toggle = () => {
    this.props.toggleCancel();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Publish Wiki')}</SeahubModalHeader>
        <PublishWikiContent
          wiki={this.props.wiki}
          onPublish={this.props.onPublish}
          handleCustomUrl={this.props.handleCustomUrl}
          customUrlString={this.props.customUrlString}
          enableServerRender={this.props.enableServerRender}
        />
      </Modal>
    );
  }
}

PublishWikiDialog.propTypes = propTypes;

export default PublishWikiDialog;
