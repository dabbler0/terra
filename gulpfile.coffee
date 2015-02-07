gulp = require 'gulp'
gutil = require 'gulp-util'
browserify = require 'browserify'
coffeeify = require 'caching-coffeeify'
transform = require 'vinyl-transform'
rename = require 'gulp-rename'
coffee = require 'gulp-coffee'

gulp.task 'browser', ->
  browserified = transform (filename) ->
    b = browserify(filename, standalone: 'terra')
    b.transform(coffeeify)
    return b.bundle()
  gulp.src('src/browser.coffee')
      .pipe(browserified)
      .pipe(rename 'browser.js')
      .pipe(gulp.dest './build/')

gulp.task 'default', ['browser']
