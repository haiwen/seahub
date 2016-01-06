define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/group-members',
    'app/views/group-member2'
], function($, _, Backbone, Common, GroupMembers, ItemView) {
    'use strict';

    var View = Backbone.View.extend({

        template: _.template($('#group-manage-members-tmpl').html()),

        initialize: function(options) {

            this.group_id = options.group_id;
            this.group_name = options.group_name; 
            this.is_owner = options.is_owner; 

            this.render();
            this.$el.modal({
                appendTo: '#main',
                focus: false,
                containerCss: {
                    'width': 560
                }
            });
            this.$modalContainer = $('#simplemodal-container').css({'height':'auto'});

            this.$('[name="user_name"]').select2($.extend({
                width: '268px',
            }, Common.contactInputOptionsForSelect2()));

            this.collection = new GroupMembers();
            this.listenTo(this.collection, 'add', this.addOne);
            this.renderMemberList();
            this.setConMaxHeight();

            this.$loadingTip = this.$('.loading-tip');
            this.$listContainer = this.$('tbody');   
            this.$listError = this.$('.members .error');

            var _this = this;
            $(window).resize(function() {
                _this.setConMaxHeight();
            });
            // click other place to hide '.role-edit'
            $(document).click(function(e) {
                var target = e.target || event.srcElement;
                var $el = _this.$('.role-edit:visible');
                var $td = $el.parent();
                if ($el.length &&
                    !$el.is(target) &&
                    !$el.find('*').is(target) &&
                    !$td.find('.role-edit-icon').is(target)) {
                    $el.hide();
                    $td.find('.cur-role, .role-edit-icon').show();
                }
            });
        },

        render: function() {
            var title = gettext("{placeholder} Members").replace('{placeholder}', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(this.group_name) + '">' + Common.HTMLescape(this.group_name) + '</span>');
            this.$el.html(this.template({
                title: title,
                is_owner: this.is_owner
            }));

            return this;
        },

        events: {
            'submit form': 'formSubmit'
        },

        addOne: function(item, collection, options) {
            var view = new ItemView({
                model: item,
                group_id: this.group_id,
                is_owner: this.is_owner
            });
            if (options.prepend) {
                this.$listContainer.prepend(view.render().el);
            } else {
                this.$listContainer.append(view.render().el);
            }
        },

        renderMemberList: function() {
            var _this = this;
            this.collection.setGroupId(this.group_id);
            this.collection.fetch({
                cache: false,
                data: {'avatar_size': 40},
                success: function(collection, response, opts) {
                    _this.$loadingTip.hide();
                },  
                error: function(collection, response, opts) {
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
                    _this.$listError.html(err_msg).show();
                }
            });
        },

        formSubmit: function() {
            var _this = this;
            var $input = this.$('[name="user_name"]');
            var input_val = $.trim($input.val());
            if (!input_val) {
                return false;
            }
            var input_val_list = input_val.split(',');
            if (input_val_list.length == 1) {
                this.collection.create({'email': input_val}, {
                    wait: true,
                    validate: true,
                    prepend: true,
                    success: function() {
                        $input.select2('val', '');
                    },  
                    error: function(collection, response, options) {
                        var err_msg;
                        if (response.responseText) {
                            err_msg = response.responseJSON.error_msg;
                        } else {
                            err_msg = gettext('Please check the network.');
                        }   
                        _this.$listError.html(err_msg).show();
                    }  
                });
            } else {
                // TODO: input_val_list.length > 1
            }

            return false;
        },

        setConMaxHeight: function() {
            var $modalContainer = this.$modalContainer;
            this.$('.members').css({
                'max-height': $(window).height()
                    - parseInt($modalContainer.css('top'))
                    - parseInt($modalContainer.css('padding-top'))
                    - parseInt($modalContainer.css('padding-bottom'))
                    - this.$('h3').outerHeight(true)
                    - this.$('form').outerHeight(true),
                'overflow': 'auto'
            });
        }

    });

    return View;
});
