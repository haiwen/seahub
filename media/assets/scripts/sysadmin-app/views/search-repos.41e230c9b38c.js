define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/repo',
    'sysadmin-app/collection/search-repos'
], function($, _, Backbone, Common, RepoView, RepoCollection) {
    'use strict';

    var ReposView = Backbone.View.extend({

        id: 'search-libraries',

        template: _.template($("#search-libraries-tmpl").html()),

        initialize: function() {
            this.repoCollection = new RepoCollection();
            this.listenTo(this.repoCollection, 'add', this.addOne);
            this.listenTo(this.repoCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.append(this.template());

            this.$form = this.$('#search-repo-form');
            this.$name = $('[name="name"]', this.$form);
            this.$owner = $('[name="owner"]', this.$form);

            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        events: {
            'submit #search-repo-form': 'formSubmit'
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function(option) {
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.getContent(option);
        },

        getContent: function(obj) {
            this.initPage();
            var _this = this;
            this.repoCollection.fetch({
                data: obj,
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                },
                complete:function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        reset: function() {
            var name = this.repoCollection.search_name;
            var owner = this.repoCollection.search_owner;
            app.router.navigate('#search-libs/?name=' + encodeURIComponent(name) + '&owner=' + encodeURIComponent(owner));
            this.$name.val(name);
            this.$owner.val(owner);

            this.$loadingTip.hide();
            if (this.repoCollection.length > 0) {
                this.repoCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
        },

        addOne: function(library) {
            var view = new RepoView({model: library});
            this.$tableBody.append(view.render().el);
        },

        formSubmit: function() {
            var name = $.trim(this.$name.val());
            var owner = $.trim(this.$owner.val());

            if (!name && !owner) {
                return false;
            }

            this.getContent({'name': name, 'owner': owner});
            return false;
        }
    });

    return ReposView;

});
