define([
    'underscore',
    'backbone',
    'common'
], function(_, Backbone, Common) {
    'use strict';

    var Collection = Backbone.Collection.extend({

        initialize: function(options) {
            this.repo_id = options.repo_id;
        },

        url: function() {
            return Common.getUrl({
                name: 'repo_shared_download_links',
                repo_id: this.repo_id
            });
        }
    });

    return Collection;
});
