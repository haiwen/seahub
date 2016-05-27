define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'sysadmin-app/views/repo',
    'sysadmin-app/collection/repos'
], function($, _, Backbone, Common, Moment, RepoView, RepoCollection) {
    'use strict';

    var ReposView = Backbone.View.extend({

        id: 'libraries',

        template: _.template($("#libraries-tmpl").html()),

        initialize: function() {
            this.repoCollection = new RepoCollection();
            this.listenTo(this.repoCollection, 'add', this.addOne);
            this.listenTo(this.repoCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            var data = {'cur_tab': 'all'};
            this.$el.html(this.template(data));
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$jsPrevious = this.$('.js-previous');
            this.$jsNext = this.$('.js-next');
        },

        events: {
            'click #paginator .js-next': 'getNextPage',
            'click #paginator .js-previous': 'getPreviousPage'
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
            this.$jsNext.hide();
            this.$jsPrevious.hide();
        },

        getNextPage: function() {
            this.initPage();
            var current_page = this.repoCollection.state.current_page;
            if (this.repoCollection.state.hasNextPage) {
                this.repoCollection.getPage(current_page + 1, {
                    reset: true
                });
            }

            return false;
        },

        getPreviousPage: function() {
            this.initPage();
            var current_page = this.repoCollection.state.current_page;
            if ( current_page > 1) {
                this.repoCollection.getPage(current_page - 1, {
                    reset: true
                });
            }
            return false;
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function(option) {
            this.option = option;
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.showLibraries();
        },

        showLibraries: function() {
            this.initPage();
            var _this = this,
                current_page = this.option.current_page || 1;

            this.repoCollection.fetch({
                data: {'page': current_page},
                cache: false, // for IE
                reset: true,
                error: function (collection, response, opts) {
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = $.parseJSON(response.responseText).error_msg;
                        }
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    Common.feedback(err_msg, 'error');
                }
            });
        },

        reset: function() {
            var length = this.repoCollection.length,
                current_page = this.repoCollection.state.current_page;

            this.$loadingTip.hide();

            if (length > 0) {
                this.repoCollection.each(this.addOne, this);
                this.$table.show();
                this.renderPaginator();
            } else {
                this.$emptyTip.show();
            }

            app.router.navigate('libraries/?page=' + current_page);
        },

        renderPaginator: function() {
            if (this.repoCollection.state.hasNextPage) {
                this.$jsNext.show();
            } else {
                this.$jsNext.hide();
            }

            var current_page = this.repoCollection.state.current_page;
            if (current_page > 1) {
                this.$jsPrevious.show();
            } else {
                this.$jsPrevious.hide();
            }
        },

        addOne: function(library) {
            var view = new RepoView({model: library});
            this.$tableBody.append(view.render().el);
        }
    });

    return ReposView;

});
