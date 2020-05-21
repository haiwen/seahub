define([
    'underscore',
    'backbone',
    'common',
    'app/models/dirent'
], function(_, Backbone, Common, Dirent) {
    'use strict';

    var DirentCollection = Backbone.Collection.extend({
        model: Dirent,

        url: function () {
            return Common.getUrl({name: 'list_lib_dir', repo_id: this.repo_id});
        },

        initialize: function() {

        },

        parse: function (data) {
            this.repo_name = data.repo_name;
            this.user_perm = data.user_perm;
            this.no_quota = data.no_quota;
            this.encrypted = data.encrypted;
            this.repo_owner = data.repo_owner;
            this.is_repo_owner = data.is_repo_owner;
            this.is_virtual = data.is_virtual;
            this.has_been_shared_out = data.has_been_shared_out;
            this.dirent_more = data.dirent_more;
            this.more_start = data.more_start;
            this.is_admin = data.is_admin;
            return data.dirent_list; // return the array
        },

        // category: 'my-libs', 'shared-libs'
        setPath: function(category, repo_id, path) {
            this.category = category;
            this.repo_id = repo_id;
            this.path = path;
        }
    });

    return DirentCollection;

});
