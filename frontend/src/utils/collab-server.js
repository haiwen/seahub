import React from 'react';
import io from 'socket.io-client';
import toaster from '../components/toast';
import { seafileAPI } from './seafile-api';
import { gettext, name, username, contactEmail, seafileCollabServer } from './constants';

const socket = io(seafileCollabServer);

class CollabServer {

  watchRepo(repoID, path, dirID) {
    socket.emit('repo_update', {
      request: 'watch_update',
      repo_id: repoID,
      user: {
        name: name,
        username: username,
        contact_email: contactEmail,
      },
    });

    socket.on('repo_update', () => {
      seafileAPI.dirMetaData(repoID, path).then((res) => {
        if (res.data.id !== dirID) {
          toaster.notify(
            <span>
              {gettext('This folder has been updated. ')}
              <a href='' >{gettext('Refresh')}</a>
            </span>,
            {duration: 3600}
          );
        }
      })
    })
  }

  unwatchRepo() {
    socket.off()
  }
}

const collabServer = new CollabServer();

export default collabServer;
