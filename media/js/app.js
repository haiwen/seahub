(function(window, app, Backbone, jQuery, _) {
    "use strict";

    var $ = jQuery;

    app.MyHomePage = Backbone.View.extend({

        initialize: function() {
            Backbone.View.prototype.initialize.apply(this, arguments);

            console.log('init MyHomePage');

            this.on('showDirents', this.showDirents, this);
        },

        showRepoList: function() {
            console.log('show repo list');
            this.repo_list = new app.RepoListView();
            $('#my-own-repos table').append(this.repo_list.render().el);
        },

        showDirents: function(id, path) {
            console.log('show repo page and hide repo list: ' + id + ' ' + path);
            var path = path || '/';

            this.dirent_list = new app.DirentListView({id: id, path: path});
            $('#my-own-repos table').children().remove();
            $('#my-own-repos table').append(this.dirent_list.render().el);
        }

    });

})(window, app, Backbone, jQuery, _);
