export class GroupsReposManager {

  constructor() {
    this.id_repo_in_groups_map = {}; // {[repo.repo_id]: [group.id, ...], ...}
  }

  init(groups) {
    if (!Array.isArray(groups) || groups.length === 0) {
      return;
    }
    groups.forEach((group) => {
      const { repos } = group;
      if (Array.isArray(repos) && repos.length > 0) {
        repos.forEach((repo) => {
          this.add(repo.repo_id, group.id);
        });
      }
    });
  }

  add(repo_id, group_id) {
    if (Array.isArray(this.id_repo_in_groups_map[repo_id])) {
      if (this.id_repo_in_groups_map[repo_id].includes(group_id)) {
        return;
      }
      this.id_repo_in_groups_map[repo_id].push(group_id);
    } else {
      this.id_repo_in_groups_map[repo_id] = [group_id];
    }
  }

  remove(repo_id, group_id) {
    let repoInGroupsIds = this.getRepoInGroupsIdsById(repo_id);
    if (!repoInGroupsIds.includes(group_id)) {
      return;
    }
    repoInGroupsIds = repoInGroupsIds.filter((groupId) => groupId === group_id);
    if (repoInGroupsIds.length === 0) {
      this.removeRepo(repo_id);
    } else {
      this.id_repo_in_groups_map[repo_id] = repoInGroupsIds;
    }
  }

  removeRepo(repo_id) {
    delete this.id_repo_in_groups_map[repo_id];
  }

  getRepoInGroupsIdsById(repoId) {
    return this.id_repo_in_groups_map[repoId] || [];
  }
}
