define([
    'underscore',
    'backbone',
	'common'
], function(_, Backbone, Common) {
    'use strict';

    var StarredItem = Backbone.Model.extend({

        getIcon: function(size) {
            if (this.get('is_dir')) {
                //var is_readonly = this.get('perm') == 'r';
                var is_readonly = false; // TODO: get the right value of is_readonly
                return Common.getDirIconUrl(is_readonly, size);
            } else {
                return Common.getFileIconUrl(this.get('obj_name'), size);
            }
        },

        getItemUrl: function() {
            var path = this.get('path'),
                repo_id = this.get('repo_id');

            if (this.get('is_dir')) {
                return '#common/lib/' + repo_id + Common.encodePath(path);
            } else {
                return app.config.siteRoot + 'lib/' + repo_id + '/file' + Common.encodePath(path);
            }
        }
    });

    return StarredItem;
});
