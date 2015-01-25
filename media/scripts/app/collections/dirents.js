define([
    'underscore',
    'backbone',
    'app/models/dirent'
], function(_, Backbone, Dirent) {
    'use strict';

    var DirentCollection = Backbone.Collection.extend({
        model: Dirent,

        initialize: function() {

        },

        parse: function (data) {
          this.repo_name = data.repo_name;
          this.user_perm = data.user_perm;
          this.encrypted = data.encrypted;
          this.is_repo_owner = data.is_repo_owner;
          this.is_virtual = data.is_virtual;

          this.dirent_more = data.dirent_more;
          this.more_start = data.more_start;
          this.share = data.share;
          return data.dirent_list; // return the array
        },

        setPath: function(repo_id, path) {
          console.log('init dir: ' + repo_id + ' ' + path);
          this.repo_id = repo_id;
          this.path = path;
          this.url = '/ajax/lib/' + repo_id + '/dir/?p=' + path;
        },
    });

    return DirentCollection;

});
