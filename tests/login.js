casper.test.begin('Log in and out function well', 5, function suite(test) {

  casper.start('http://127.0.0.1L:8000/accounts/login', function() {
    test.assertExists('form', 'login form is found');
    this.fill('form', {
      username: 'test@test.com',
      password: 'testtest'
    }, true);
  });
  // redirect
  casper.then(function() {
    test.assertUrlMatch(/home\/my\/$/, 'redirect url is at home page');
    test.assertNotVisible('#user-info-popup');
    this.click('#my-info');
    test.assertVisible('#user-info-popup');
    this.click('a#logout');
  });
  // redirect
  casper.run(function() {
    test.assertUrlMatch(/accounts\/logout\/$/, 'redirect url is at logout page');
    test.done();
  });

});
