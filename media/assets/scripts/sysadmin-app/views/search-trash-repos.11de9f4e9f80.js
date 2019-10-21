define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'sysadmin-app/views/trash-repo',
    'sysadmin-app/collection/search-trash-repos'
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
        },

        events: {
            'click .js-clean': 'cleanTrashLibraries'
        },

        cleanTrashLibraries: function() {
            var _this = this;
            var owner = this.trashRepoCollection.search_owner;
            var popupTitle = gettext("Delete Library By Owner");
            var popupContent = gettext("Are you sure you want to delete all %s's libraries?").replace('%s', '<span class="op-target ellipsis ellipsis-op-target">' + Common.HTMLescape(owner) + '</span>');
            var yesCallback = function() {
                $.ajax({
                    url: Common.getUrl({'name':'admin-trash-libraries'}),
                    type: 'DELETE',
                    data: {'owner': owner},
                    beforeSend: Common.prepareCSRFToken,
                    dataType: 'json',
                    success: function() {
                        _this.$cleanBtn.hide();
                        _this.$tip.hide();
                        _this.$table.hide();
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

        initPage: function() {
            this.$tip.hide();
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
            this.$cleanBtn.hide();
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
                data: {'owner': this.option.owner},
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                },
                complete: function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        reset: function() {
            var length = this.trashRepoCollection.length;

            this.$loadingTip.hide();

            if (length > 0) {
                this.trashRepoCollection.each(this.addOne, this);
                this.$cleanBtn.show();
                this.$tip.show();
                this.$table.show();
            } else {
                this.$emptyTip.show();
                this.$cleanBtn.hide();
            }
        },

        addOne: function(library) {
            var view = new TrashRepoView({model: library});
            this.$tableBody.append(view.render().el);
        }
    });

    return TrashReposView;

});
