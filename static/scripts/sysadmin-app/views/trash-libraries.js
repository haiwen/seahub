define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'moment',
    'sysadmin-app/views/trash-library',
    'sysadmin-app/collection/trash-libraries'
], function($, _, Backbone, Common, Moment, TrashLibraryView,
    TrashLibraryCollection) {
    'use strict';

    var TrashLibrariesView = Backbone.View.extend({

        id: 'admin-trash-libraries',

        template: _.template($("#trash-libraries-tmpl").html()),

        initialize: function() {
            this.trashLibraryCollection = new TrashLibraryCollection();
            this.listenTo(this.trashLibraryCollection, 'add', this.addOne);
            this.listenTo(this.trashLibraryCollection, 'reset', this.reset);
        },

        render: function() {
            var data = {'cur_tab': 'trash',};
            this.$el.html(this.template(data));
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
        },

        events: {
            'click #clean-trash-libraries': 'cleanTrashLibraries',
        },

        cleanTrashLibraries: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({'name':'admin-trash-libraries'}),
                type: 'DELETE',
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: function() {
                    _this.$table.hide();
                    _this.$emptyTip.show();
                    Common.feedback(gettext("Success"), 'success');
                },
                error: function(xhr, textStatus, errorThrown) {
                    Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                }
            })
        },

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
        },

        hide: function() {
            this.$el.detach();
        },

        show: function(option) {
            this.option = option;
            this.render();
            $("#right-panel").html(this.$el);
            this.showTrashLibraries();
        },

        showTrashLibraries: function() {
            this.initPage();
            var _this = this;

            this.trashLibraryCollection.fetch({
                data: {},
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
            var length = this.trashLibraryCollection.length;

            this.$loadingTip.hide();

            if (length > 0) {
                this.trashLibraryCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
        },

        addOne: function(library) {
            var view = new TrashLibraryView({model: library});
            this.$tableBody.append(view.render().el);
        }
    });

    return TrashLibrariesView;

});
