import cookie from 'react-cookies';
import { siteRoot } from '../utils/constants';
import { MetadataManagerAPI } from '../metadata';

class TagsManagerAPI extends MetadataManagerAPI {

  getTagsStatus = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-status/';
    return this.req.get(url);
  };

  openTags = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-status/';
    return this.req.put(url);
  };

  closeTags = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags-status/';
    return this.req.delete(url);
  };

  getTags = (repoID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags/';
    return this.req.get(url);
  };

  modifyTags = (repoID, data) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags/';
    const params = {
      tags_data: data,
    };
    return this.req.put(url, params);
  };

  deleteTags = (repoID, tagIds) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags/';
    const params = {
      tag_ids: tagIds,
    };
    return this.req.delete(url, { data: params });
  };

  addTags = (repoID, tags) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tags/';
    const params = {
      tags_data: tags
    };
    return this.req.post(url, params);
  };

  getTagFiles = (repoID, tagID) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/tag-files/' + tagID + '/';
    return this.req.get(url);
  };

  // file tag
  addFileTags = (repoID, recordId, tagIds) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/file-tags/';
    const params = {
      record_id: recordId,
      tags: tagIds,
    };
    return this.req.post(url, params);
  };

  updateFileTags = (repoID, recordId, tagIds) => {
    const url = this.server + '/api/v2.1/repos/' + repoID + '/metadata/file-tags/';
    const params = {
      record_id: recordId,
      tags: tagIds,
    };
    return this.req.put(url, params);
  };

}

const tagsAPI = new TagsManagerAPI();
const xcsrfHeaders = cookie.load('sfcsrftoken');
tagsAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

export default tagsAPI;
