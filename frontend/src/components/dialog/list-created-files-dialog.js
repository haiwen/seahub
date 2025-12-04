import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button, Modal, ModalBody, ModalFooter, Table } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

import '../../css/list-created-files-dialog.css';

const propTypes = {
  activity: PropTypes.object.isRequired,
  onListCreatedFilesToggle: PropTypes.func.isRequired,
};

dayjs.extend(relativeTime);

class ListCreatedFilesDialog extends React.Component {

  toggle = () => {
    this.props.onListCreatedFilesToggle();
  };

  render() {
    let activity = this.props.activity;
    return (
      <Modal isOpen={true} toggle={this.toggle} className='list-created-files-dialog'>
        <SeahubModalHeader toggle={this.toggle}>{gettext('Created Files')}</SeahubModalHeader>
        <ModalBody>
          <Table>
            <thead>
              <tr>
                <th width='75%'>{gettext('Name')}</th>
                <th width='25%'>{gettext('Time')}</th>
              </tr>
            </thead>
            <tbody>
              {
                activity.createdFilesList.map((item, index) => {
                  let fileURL = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
                  let fileLink = <a href={fileURL} target='_blank' rel="noreferrer">{item.name}</a>;
                  if (item.name.endsWith('(draft).md')) { // be compatible with the existing draft files
                    fileLink = item.name;
                  }
                  return (
                    <tr key={index}>
                      <td>{fileLink}</td>
                      <td>{dayjs(item.time).fromNow()}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ListCreatedFilesDialog.propTypes = propTypes;

export default ListCreatedFilesDialog;
