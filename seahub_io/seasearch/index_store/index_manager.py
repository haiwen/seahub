
class IndexManager(object):
    def file_search(self, query, repos, repo_file_index, count, suffixes, search_path, obj_type, time_range, size_range, search_filename_only):
        return repo_file_index.search_files(repos, query, 0, count, suffixes, search_path, obj_type, time_range, size_range, search_filename_only)
    def search_wikis(self, query, wiki_ids, wiki_index, count):
        return wiki_index.search_wikis(wiki_ids, query, 0, count)

    
