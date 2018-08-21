define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var Collection = Backbone.Collection.extend({

        initialize: function(options) {
            this.repo_id = options.repo_id;
            this.is_group_owned_repo = options.is_group_owned_repo;
        },

        url: function() {
            return Common.getUrl({
                name: this.is_group_owned_repo ?
                    'group-owned-library-group-folder-permission' :
                    'repo_group_folder_perm',
                repo_id: this.repo_id
            });
        }
    });

    return Collection;
});
