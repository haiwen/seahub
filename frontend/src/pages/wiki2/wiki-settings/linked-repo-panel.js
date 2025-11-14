import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ModalBody } from 'reactstrap';
import wikiAPI from '../../../utils/wiki-api';
import Loading from '../../../components/loading';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import WikiRepoListDialog from '../wiki-repo-list';
import { Utils } from '../../../utils/utils';
import LinkedRepoItem from './linked-repo-item';
import Repo from '../../../models/repo';
import { getWikiRepos, getWikiSettings, saveWikiSettingsIntoStorage } from '../utils/wiki-setting';

const { wikiId } = window.wiki.config;

export default function LinkedRepoPanel() {
  const [isLoading, setIsLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);
  const [repoOptions, setRepoOptions] = useState([]);
  const [linkedRepos, setLinkedRepos] = useState([]);

  const [isShowRepoListDialog, setIsShowRepoListDialog] = useState(false);
  const linkedRepoRef = useRef(null);

  useEffect(() => {
    const wikiSettings = getWikiSettings();
    const repos = getWikiRepos();
    const { enable_link_repos: isOpen, linked_repos: linkedRepoIds } = wikiSettings;

    let repoList = repos.map(item => {
      let repo = new Repo(item);
      repo.sharePermission = 'rw';
      return repo;
    });

    repoList = repoList.filter(item => item.enable_metadata);

    const options = repoList.map(item => {
      return {
        id: item.repo_id,
        name: item.repo_name,
        value: item.repo_name,
        label: item.repo_name,
        permission: item.permission,
      };
    });

    const optionsMap = options.reduce((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
    const linkedRepos = linkedRepoIds.map(id => optionsMap[id]).filter(Boolean);

    setIsLoading(false);
    setIsOpen(isOpen);
    setRepoOptions(options);
    setLinkedRepos(linkedRepos);
  }, []);

  const saveSettingsIntoLocalStorage = useCallback((isOpen, linkedRepos) => {
    const linked_repo_ids = linkedRepos.map(item => item.id);
    const newWikiSettings = { enable_link_repos: isOpen, linked_repos: linked_repo_ids };
    saveWikiSettingsIntoStorage(newWikiSettings);
  }, []);

  const onAddLinkClick = useCallback(() => {
    setIsShowRepoListDialog(true);
  }, []);

  const onAddLinkedRepo = useCallback((selectedRepo) => {
    const repo_id = selectedRepo.id;
    wikiAPI.addWikiLinkedRepo(wikiId, repo_id).then(res => {
      const newLinkedRepos = [...linkedRepos, selectedRepo];

      saveSettingsIntoLocalStorage(isOpen, newLinkedRepos);
      setLinkedRepos(newLinkedRepos);

      setTimeout(() => {
        linkedRepoRef.current.scrollTop = linkedRepoRef.current.scrollHeight;
      }, 300);
    }).catch(e => {
      const message = Utils.getErrorMsg(e);
      toaster.danger(message);
    });
  }, [isOpen, linkedRepos, saveSettingsIntoLocalStorage]);

  const onDeleteLinkedRepo = useCallback((deleteRepo => {
    const repo_id = deleteRepo.id;
    wikiAPI.deleteWikiLinkedRepo(wikiId, repo_id).then(res => {
      const newLinkedRepos = linkedRepos.filter(item => item.id !== deleteRepo.id);

      saveSettingsIntoLocalStorage(isOpen, newLinkedRepos);
      setLinkedRepos(newLinkedRepos);
    }).catch(e => {
      const message = Utils.getErrorMsg(e);
      toaster.danger(message);
    });
  }), [isOpen, linkedRepos, saveSettingsIntoLocalStorage]);

  const onDialogClose = () => {
    setIsShowRepoListDialog(false);
  };

  const tipMessage = gettext('After connecting libraries. you can list files from them in the Wiki pages.');

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <ModalBody className="metadata-status-management-dialog">
        <p className="tip m-0">{tipMessage}</p>
        {isOpen && (
          <div className='wiki-linked-repos'>
            <div className='wiki-linked-repos__header'>
              <span className='title'>{gettext('Connected libraries')}</span>
              <span className='operation' onClick={onAddLinkClick}>
                {gettext('Add library')}
              </span>
            </div>
            <div className='wiki-linked-repos__body' ref={linkedRepoRef}>
              <table className='linked-repos-table table-thead-hidden'>
                <thead>
                  <tr>
                    <th width='6%'>{/* icon */}</th>
                    <th width='80%'></th>
                    <th width='20%'></th>
                  </tr>
                </thead>
                <tbody>
                  {linkedRepos.map(item => {
                    return <LinkedRepoItem key={item.id} repoItem={item} onDeleteLinkedRepo={onDeleteLinkedRepo}/>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ModalBody>
      {isShowRepoListDialog && (
        <WikiRepoListDialog repoOptions={repoOptions} linkedRepos={linkedRepos} onAddLinkedRepo={onAddLinkedRepo} onDialogClose={onDialogClose} />
      )}
    </>
  );
}
