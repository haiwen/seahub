define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/library-dirent'
], function(_, Backbone, Common, LibraryDirentModel) {
    'use strict';

    var LibraryDirentCollection = Backbone.Collection.extend({
        model: LibraryDirentModel,
        parse: function (data) {
            this.repo_name = data.repo_name;
            this.repo_id = data.repo_id;
            this.is_system_library = data.is_system_library;
            return data.dirent_list; // return the array
        },
        setPath: function(repo_id, path) {
            this.repo_id = repo_id;
            this.path = path;
        }
    });

    return LibraryDirentCollection;
});
