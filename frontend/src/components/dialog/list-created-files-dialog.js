import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button, Modal, ModalBody, ModalFooter, Table } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  activity: PropTypes.object.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

dayjs.extend(relativeTime);

class ListCreatedFileDialog extends React.Component {

  toggle = (activity) => {
    this.props.toggleCancel(activity);
  };

  render() {
    let activity = this.props.activity;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <SeahubModalHeader toggle={this.toggle}>
          {(() => {
            const isDir = activity.obj_type === 'dir';
            if (activity.op_type === 'batch_delete') {
              return isDir ? gettext('Deleted Folders') : gettext('Deleted Files');
            }
            return isDir ? gettext('Created Folders') : gettext('Created Files');
          })()}
        </SeahubModalHeader>
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
                (activity.createdFilesList || activity.details || []).map((item, index) => {
                  let name = item.name || (item.path ? item.path.split('/').pop() : '');
                  let displayName;
                  // For batch_delete, show plain text without link as the file no longer exists
                  if (activity.op_type === 'batch_delete') {
                    displayName = name;
                  } else {
                    let repoID = item.repo_id || activity.repo_id;
                    let fileURL = `${siteRoot}lib/${repoID}/file${Utils.encodePath(item.path)}`;
                    displayName = <a href={fileURL} target='_blank' rel="noreferrer">{name}</a>;
                    // be compatible with the existing draft files
                    if (name.endsWith('(draft).md')) {
                      displayName = name;
                    }
                  }
                  return (
                    <tr key={index}>
                      <td>{displayName}</td>
                      <td>{dayjs(item.time || activity.time).fromNow()}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle.bind(this, activity)}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ListCreatedFileDialog.propTypes = propTypes;

export default ListCreatedFileDialog;
