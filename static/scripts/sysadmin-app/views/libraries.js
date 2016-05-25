define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'sysadmin-app/views/library',
    'sysadmin-app/collection/libraries'
], function($, _, Backbone, Common, Moment, LibraryView, LibraryCollection) {
    'use strict';

    var LibrariesView = Backbone.View.extend({

        id: 'admin-libraries',

        template: _.template($("#libraries-tmpl").html()),

        initialize: function() {
            this.libraryCollection = new LibraryCollection();
            this.listenTo(this.libraryCollection, 'add', this.addOne);
            this.listenTo(this.libraryCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            var data = {'cur_tab': 'all',};
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
            var current_page = this.libraryCollection.state.current_page;
            if (this.libraryCollection.state.hasNextPage) {
                this.libraryCollection.getPage(current_page + 1, {
                    reset: true
                });
            }

            return false;
        },

        getPreviousPage: function() {
            this.initPage();
            var current_page = this.libraryCollection.state.current_page;
            if ( current_page > 1) {
                this.libraryCollection.getPage(current_page - 1, {
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

            this.libraryCollection.fetch({
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
            var length = this.libraryCollection.length,
                current_page = this.libraryCollection.state.current_page;

            this.$loadingTip.hide();

            if (length > 0) {
                this.libraryCollection.each(this.addOne, this);
                this.$table.show();
                this.renderPaginator();
            } else {
                this.$emptyTip.show();
            }

            app.router.navigate('libraries/?page=' + current_page);
        },

        renderPaginator: function() {
            if (this.libraryCollection.state.hasNextPage) {
                this.$jsNext.show();
            } else {
                this.$jsNext.hide();
            }

            var current_page = this.libraryCollection.state.current_page;
            if (current_page > 1) {
                this.$jsPrevious.show();
            } else {
                this.$jsPrevious.hide();
            }
        },

        addOne: function(library) {
            var view = new LibraryView({model: library});
            this.$tableBody.append(view.render().el);
        }
    });

    return LibrariesView;

});
