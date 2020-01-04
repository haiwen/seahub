define([
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/models/dirent'
], function(_, Backbone, Common, DirentModel) {
    'use strict';

    var DirentCollection = Backbone.Collection.extend({
        model: DirentModel,

        url: function() {
            return Common.getUrl({name: 'admin-library-dirents', repo_id: this.repo_id});
        },

        parse: function(data) {
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

    return DirentCollection;
});
