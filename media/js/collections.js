(function(app, Backbone){
    "use strict";

    app.RepoList = Backbone.Collection.extend({
        model: app.models.Repo,
        url: app.config.siteRoot + 'api2/repos/',

        initialize: function() {
            // Backbone.Collection.prototype.initialize.apply(this, arguments);

            console.log('init RepoList');
        }
    });

}(app, Backbone));
