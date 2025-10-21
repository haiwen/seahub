import classNames from 'classnames';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ModalBody } from 'reactstrap';
import wikiAPI from '../../../utils/wiki-api';
import Loading from '../../../components/loading';
import Switch from '../../../components/switch';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import WikiRepoListDialog from '../wiki-repo-list';
import { Utils } from '../../../utils/utils';
import LinkedRepoItem from './linked-repo-item';
import { seafileAPI } from '../../../utils/seafile-api';
import Repo from '../../../models/repo';

const { wikiId } = window.wiki.config;

export default function LinkedRepoPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isChanging, setIsChanging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [linkedRepoIds, setLinkedRepoIds] = useState([]);

  const [isReposInfoLoaded, setIsRepoInfoLoaded] = useState(false);
  const [repoOptions, setRepoOptions] = useState([]);

  const [isShowRepoListDialog, setIsShowRepoListDialog] = useState(false);
  const [linkedRepos, setLinkedRepos] = useState([]);
  const linkedRepoRef = useRef(null);

  useEffect(() => {
    wikiAPI.getWikiSettings(wikiId).then(res => {
      const { enable_link_repos: isOpen, linked_repos: linkedRepoIds } = res.data;
      setIsOpen(isOpen);
      setLinkedRepoIds(linkedRepoIds);

      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    seafileAPI.listRepos({ 'type': ['mine', 'shared', 'public'] }).then(res => {
      const repoList = res.data.repos.map(item => {
        let repo = new Repo(item);
        repo.sharePermission = 'rw';
        return repo;
      });
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
      setIsRepoInfoLoaded(true);
      setRepoOptions(options);
      setLinkedRepos(linkedRepos);
    });
  }, [isOpen, linkedRepoIds]);

  const onValueChange = useCallback(() => {
    const newValue = !isOpen;
    setIsChanging(true);
    wikiAPI.updateWikiSettings(wikiId, newValue).then(res => {
      setIsOpen(newValue);
      if (!newValue) {
        setLinkedRepos([]);
      }
      setIsChanging(false);
      const message = newValue ? gettext('Related database opened') : gettext('Related database closed');
      toaster.success(message);
    });
  }, [isOpen]);

  const onAddLinkClick = useCallback(() => {
    setIsShowRepoListDialog(true);
  }, []);

  const onAddLinkedRepo = useCallback((selectedRepo) => {
    const repo_id = selectedRepo.id;
    wikiAPI.addWikiLinkedRepo(wikiId, repo_id).then(res => {
      const newLinkedRepos = [...linkedRepos, selectedRepo];
      setLinkedRepos(newLinkedRepos);
      setTimeout(() => {
        linkedRepoRef.current.scrollTop = linkedRepoRef.current.scrollHeight;
      }, 300);
    }).catch(e => {
      const message = Utils.getErrorMsg(e);
      toaster.danger(message);
    });
  }, [linkedRepos]);

  const onDeleteLinkedRepo = useCallback((deleteRepo => {
    const repo_id = deleteRepo.id;
    wikiAPI.deleteWikiLinkedRepo(wikiId, repo_id).then(res => {
      const newLinkedRepos = linkedRepos.filter(item => item.id !== deleteRepo.id);
      setLinkedRepos(newLinkedRepos);
    }).catch(e => {
      const message = Utils.getErrorMsg(e);
      toaster.danger(message);
    });
  }), [linkedRepos]);

  const onDialogClose = () => {
    setIsShowRepoListDialog(false);
  };

  const tipMessage = gettext('After enabling the associated library function, you can select files, pictures, and videos from the associated library on the page.');

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <ModalBody className="metadata-status-management-dialog">
        <Switch
          checked={isOpen}
          disabled={isChanging}
          size="large"
          textPosition="right"
          className={classNames('change-metadata-status-management w-100', { 'disabled': isChanging })}
          onChange={onValueChange}
          placeholder={gettext('Enable related database')}
        />
        <p className="tip m-0">{tipMessage}</p>
        {isOpen && (
          <div className='wiki-linked-repos'>
            <div className='wiki-linked-repos__header'>
              <span className='title'>{gettext('Related libraries')}</span>
              {!isReposInfoLoaded && <span></span>}
              {isReposInfoLoaded && (
                <span className='operation' onClick={onAddLinkClick}>
                  {gettext('Add Libraries')}
                </span>
              )}
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
