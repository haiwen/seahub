(function(window, app, Backbone, jQuery, _) {
    "use strict";

    var $ = jQuery;

    app.MyHomePage = Backbone.View.extend({

        initialize: function() {
            this.repo_list = new app.RepoListView();
            $('#my-own-repos table').append(this.repo_list.render().el);
        }
    });

})(window, app, Backbone, jQuery, _);
