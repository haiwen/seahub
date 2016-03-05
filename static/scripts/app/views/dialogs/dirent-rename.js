define([
    'jquery',
    'underscore',
    'backbone',
    'common',
], function($, _, Backbone, Common) {
    'use strict';

    var DirentRenameDialog = Backbone.View.extend({

        template: _.template($("#dirent-rename-dialog-template").html()),

        initialize: function(options) {
            this.dirent = options.dirent;
            this.dir = options.dir;

            this.render();
            this.$el.modal({appendTo:'#main'});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.$error = this.$('.error');
            this.$form = this.$('form');
        },

        render: function() {
            var title = this.dirent.get('is_dir') ?
                gettext("Rename Folder") : gettext("Rename File");

            this.$el.html(this.template({
                form_title: title,
                dirent_name: this.dirent.get('obj_name')
            }));

            return this;
        },

        events: {
            'submit form': 'formSubmit'
        },

        formSubmit: function() {
            var _this = this;
            var new_name = $.trim(this.$('[name="newname"]').val());

            if (!new_name) {
                return false;
            }
            if (new_name == this.dirent.get('obj_name')) {
                $.modal.close();
                return false;
            }

            var $submit_btn = this.$('[type="submit"]');
            Common.disableButton($submit_btn);

            this.dirent.rename({
                newname: new_name,
                success: function() {
                    $.modal.close();
                },
                error: function(xhr, textStatus, errorThrown) {
                    var err;
                    if (xhr.responseText) {
                        err = $.parseJSON(xhr.responseText).error;
                    } else {
                        err = gettext("Failed. Please check the network.");
                    }
                    _this.$error.html(err).removeClass('hide');
                    Common.enableButton($submit_btn);
                }
            });
            return false;
        }

    });

    return DirentRenameDialog;
});
