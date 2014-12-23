(function(window, app, Backbone, jQuery, _){
    "use strict";

    var $ = jQuery;

    app.RepoView = Backbone.View.extend({
        tagName: 'tr',
        template: _.template(app.templates.repo),

        events: {
            'hover' : 'showAction'
        },

        initialize: function() {
            console.log('init RepoView');
            Backbone.View.prototype.initialize.apply(this, arguments);

            // _.bindAll(this, 'showAction');

            // this.model.on({
            //     'hover': this.showAction
            // }, this);
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        showAction: function(){
            this.$el.addClass('hl');
            this.$el.find('.op-icon').removeClass('vh');
        }

    });

    app.RepoListView = Backbone.View.extend({
        tagName: 'tbody',

        initialize: function() {
            // Backbone.View.prototype.initialize.apply(this, arguments);

            console.log('init RepoListView')

            this.repoList = new app.RepoList();
            this.repoList.bind('sync', this.render, this);
            this.repoList.fetch();
        },

        render: function(eventName) {
            console.log("repoListView.render()");

            this.repoList.each(function(repo) {
                $(this.el).append(new app.RepoView({model: repo}).render().el);
            }, this);

            return this;
        }
    });

}(window, app, Backbone, jQuery, _));
