define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'sysadmin-app/views/trash-repo',
    'sysadmin-app/collection/trash-repos'
], function($, _, Backbone, Common, Moment, TrashRepoView,
    TrashRepoCollection) {
    'use strict';

    var TrashReposView = Backbone.View.extend({

        id: 'trash-libraries',

        tabNavTemplate: _.template($("#libraries-tabnav-tmpl").html()),
        template: _.template($("#trash-libraries-tmpl").html()),

        initialize: function() {
            this.trashRepoCollection = new TrashRepoCollection();
            this.listenTo(this.trashRepoCollection, 'add', this.addOne);
            this.listenTo(this.trashRepoCollection, 'reset', this.reset);

            this.render();
        },

        render: function() {
            this.$el.html(this.tabNavTemplate({'cur_tab': 'trash'}) + this.template());

            this.$tip = this.$('.tip');
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$cleanBtn = this.$('.js-clean');
            this.$jsPrevious = this.$('.js-previous');
            this.$jsNext = this.$('.js-next');
        },

        events: {
            'click .js-clean': 'cleanTrashLibraries',
            'click #paginator .js-next': 'getNextPage',
            'click #paginator .js-previous': 'getPreviousPage'
        },

        cleanTrashLibraries: function() {
            var _this = this;
            var popupTitle = gettext("Clear Trash");
            var popupContent = gettext("Are you sure you want to clear trash?");
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl({'name':'admin-trash-libraries'}),
                    type: 'DELETE',
                    beforeSend: Common.prepareCSRFToken,
                    dataType: 'json',
                    success: function() {
                        _this.$cleanBtn.hide();
                        _this.$tip.hide();
                        _this.$table.hide();
                        _this.$jsNext.hide();
                        _this.$jsPrevious.hide();
                        _this.$emptyTip.show();
                        Common.feedback(gettext("Success"), 'success');
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                    },
                    complete: function() {
                        $.modal.close();
                    }
                });
            };
            Common.showConfirm(popupTitle, popupContent, yesCallback);
        },

        getNextPage: function() {
            this.initPage();
            var current_page = this.trashRepoCollection.state.current_page;
            if (this.trashRepoCollection.state.has_next_page) {
                this.trashRepoCollection.getPage(current_page + 1, {
                    reset: true
                });
            }

            return false;
        },

        getPreviousPage: function() {
            this.initPage();
            var current_page = this.trashRepoCollection.state.current_page;
            if (current_page > 1) {
                this.trashRepoCollection.getPage(current_page - 1, {
                    reset: true
                });
            }
            return false;
        },

        initPage: function() {
            this.$tip.hide();
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
            this.$cleanBtn.hide();
            this.$jsNext.hide();
            this.$jsPrevious.hide();
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
            this.showTrashLibraries();
        },

        showTrashLibraries: function() {
            this.initPage();
            var _this = this;

            this.trashRepoCollection.fetch({
                data: {'page': this.option.page},
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                }
            });
        },

        reset: function() {
            // update the url
            var current_page = this.trashRepoCollection.state.current_page;
            app.router.navigate('trash-libs/?page=' + current_page);

            this.$loadingTip.hide();
            if (this.trashRepoCollection.length > 0) {
                this.trashRepoCollection.each(this.addOne, this);
                this.$cleanBtn.show();
                this.$tip.show();
                this.$table.show();
                this.renderPaginator();
            } else {
                this.$emptyTip.show();
                this.$cleanBtn.hide();
            }
        },

        renderPaginator: function() {
            if (this.trashRepoCollection.state.has_next_page) {
                this.$jsNext.show();
            } else {
                this.$jsNext.hide();
            }

            var current_page = this.trashRepoCollection.state.current_page;
            if (current_page > 1) {
                this.$jsPrevious.show();
            } else {
                this.$jsPrevious.hide();
            }
        },

        addOne: function(library) {
            var view = new TrashRepoView({model: library});
            this.$tableBody.append(view.render().el);
        }
    });

    return TrashReposView;

});
