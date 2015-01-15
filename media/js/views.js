(function(window, app, Backbone, jQuery, _){
    "use strict";

    var $ = jQuery;

    app.RepoView = Backbone.View.extend({
        tagName: 'tr',
        template: _.template(app.templates.repo),

        events: {
            'mouseenter' : 'showAction',
            'mouseleave' : 'hideAction'
        },

        initialize: function() {
            console.log('init RepoView');
            Backbone.View.prototype.initialize.apply(this, arguments);

        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        showAction: function() {
            this.$el.addClass('hl');
            this.$el.find('.op-icon').removeClass('vh');
        },

        hideAction: function() {
            this.$el.removeClass('hl');
            this.$el.find('.op-icon').addClass('vh');
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

    app.DirentView = Backbone.View.extend({
        tagName: 'tr',
        template: null,

        initialize: function() {
            this.template = _.template($('#dirent-template').html());
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    });

    app.DirentListView = Backbone.View.extend({
        tagName: 'tbody',

        initialize: function(data) {
            console.log('init DirentListView');

            if (_.isUndefined(data))
                data = {};      // TODO: show error ?

            this.direntList = new app.DirentList(data);
            this.direntList.bind('sync', this.render, this);
            this.direntList.fetch();
        },

        render: function(eventName){
            console.log("direntListView.render()");

            this.direntList.each(function(dirent){
                $(this.el).append(new app.DirentView({model: dirent}).render().el);
            }, this);

            return this;
        }
    });

}(window, app, Backbone, jQuery, _));
