define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/groups',
    'app/views/group-item'
], function($, _, Backbone, Common, Groups, GroupItemView) {
    'use strict';

    var GroupsView = Backbone.View.extend({
        el: '#groups',

        initialize: function(options) {
            this.groups = new Groups();
            this.listenTo(this.groups, 'add', this.addOne);
            this.listenTo(this.groups, 'reset', this.reset);

            this.$sideTips = $('#groups-side-tips');
            this.$loadingTip = this.$('.loading-tip');
            this.$groupList = $('#group-list');   
            this.$emptyTip = this.$('.empty-tips');
            this.$error = this.$('.error');
        },

        events: {
            'click #add-group': 'addGroup'
        },

        addOne: function(group, collection, options) {
            var view = new GroupItemView({
                model: group
            });
            if (options.prepend) {
                this.$groupList.prepend(view.render().el);
            } else {
                this.$groupList.append(view.render().el);
            }
        },

        reset: function() {
            this.$error.hide();
            this.$loadingTip.hide();
            if (this.groups.length) {
                this.$emptyTip.hide();
                this.$groupList.empty();
                this.groups.each(this.addOne, this);
                this.$groupList.show();
            } else {
                this.$emptyTip.show();
                this.$groupList.hide();
            }
        },

        render: function() {
            this.$groupList.hide();
            this.$emptyTip.hide();
            this.$loadingTip.show();

            var _this = this;
            this.groups.fetch({
                cache: false,
                data: {'with_repos': 1}, // list repos of every group
                reset: true,
                success: function (collection, response, opts) {
                },  
                error: function (collection, response, opts) {
                    _this.$loadingTip.hide();
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = gettext("Error");
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    _this.$error.html(err_msg).show();
                }
            });
        },

        show: function() {
            this.$sideTips.show();
            this.$el.show();
            this.render();
        },

        hide: function() {
            this.$sideTips.hide();
            this.$el.hide();
        },

        addGroup: function () {
            var $form = $('#group-add-form');
            $form.modal();
            $('#simplemodal-container').css({'height':'auto'});

            var groups = this.groups;
            var _this = this;
            $form.submit(function() {
                var group_name = $.trim($('[name="group_name"]', $form).val());
                if (!group_name) {
                    return false;
                }
                Common.disableButton($('[type="submit"]', $form)); 
                groups.create({'group_name': group_name, 'repos':[]}, {
                    wait: true,
                    validate: true,
                    prepend: true,  // show newly created group at the top 
                    success: function() {
                        if (groups.length == 1) {
                            _this.reset();
                        }
                    },  
                    error: function(collection, response, options) {
                        var err_msg;
                        if (response.responseText) {
                            err_msg = response.responseJSON.error_msg;
                        } else {
                            err_msg = gettext('Please check the network.');
                        }
                        Common.feedback(err_msg, 'error', Common.ERROR_TIMEOUT);
                    },  
                    complete: function() {
                        Common.closeModal();
                    }   
                }); 

                return false;
            });
        }

    });

    return GroupsView;
});
