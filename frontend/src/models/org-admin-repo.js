import { Utils } from '../utils/utils';

class OrgAdminRepo {
  constructor(object) {
    this.repoID = object.repo_id;
    this.repoName = object.repo_name;
    this.ownerName = object.owner_name;
    this.owner = object.owner;
    this.encrypted = object.encrypted;
    this.isDepartmentRepo = object.is_department_repo;
    this.groupID = object.group_id;
  }
}

export default OrgAdminRepo;
