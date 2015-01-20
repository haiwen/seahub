/*global require*/
'use strict';

require.config({
    // The shim config allows us to configure dependencies for
    // scripts that do not call define() to register a module
    shim: {
		underscore: {
			exports: '_'
		},
		backbone: {
			deps: [
				'underscore',
				'jquery'
			],
			exports: 'Backbone'
		},
        },
    paths: {
        jquery: 'libs/jq.min',
        underscore: 'libs/underscore',
        backbone: 'libs/backbone',
        text: 'libs/text'
    }
});

require([
    'backbone',
    'views/myhome',
    'routers/router'
], function(Backbone, MyHomeView, Workspace){
    // Initialize routing and start Backbone.history()
    new Workspace();
    Backbone.history.start();

    new MyHomeView();
});
