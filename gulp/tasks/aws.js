const prompt = require('gulp-prompt');
const rename = require('gulp-rename');
const awspublish = require('gulp-awspublish');
const invalidate = require('gulp-cloudfront-invalidate-aws-publish');
const gulp = require('gulp');
const fail = require('gulp-fail');
const gulpIf = require('gulp-if');
const gutil = require('gulp-util');
const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const revAll = require('gulp-rev-all');
const querystring = require('querystring');
const { argv } = require('yargs');

const prod = argv.prod || false

module.exports = (cb) => {

  const awsBucket = prod ? 'projects.dailycal.org' : 'stage-projects.dailycal.org';

  const meta = fs.readJsonSync(
    path.resolve(process.cwd(), 'meta.json'));
  const publisher = awspublish.create({
    accessKeyId: process.env.awsAccessKey,
    secretAccessKey: process.env.awsSecretKey,
    params: {
      Bucket: awsBucket,
    },
  });
  const awsDirectory = meta.publishPath;

  const headers = {
    'Cache-Control': 'max-age=300, no-transform, public',
  };

  // Ignore these files during versioning
  const versionIgnore = [
    '.html', // html files (not regex)
    /.*images.*$/, // images
    /.*\.json$/, // application data
    /.*\.csv$/, // application data
  ];

  return gulp.src('./dist/**/*')
    .pipe(gulpIf(() => {
      // As a dumb check against syncing the entire bucket
      // we check to make sure you're putting your project at
      // least 2 directories deep.
      const depth = awsDirectory.replace(/\/$/, '').split('/').length;
      return depth < 2;
    }, fail(`Can't publish to ${awsDirectory}. Check meta.json and your publishPath setting.`)))
    .on('end', () => {
      gutil.log(
        gutil.colors.cyan(`You're about to publish this project to the AWS bucket ${gutil.colors.bold.black.bgYellow(awsBucket)} under directory ${gutil.colors.bold.black.bgYellow(awsDirectory)}. This will sync this directory with your local dist folder and may cause files to be deleted.`));
    })
    .pipe(prompt.confirm('Are you sure?'))
    .pipe(rename((pubPath) => {
      // eslint-disable-next-line no-param-reassign
      pubPath.dirname = path.join(awsDirectory, pubPath.dirname.replace('.\\', ''));
    }))
    .pipe(revAll.revision({
      dontRenameFile: versionIgnore,
      dontUpdateReference: versionIgnore,
    }))
    .pipe(awspublish.gzip())
    .pipe(publisher.publish(headers, { force: false }))
    .pipe(publisher.sync(awsDirectory))
    // eslint-disable-next-line no-extra-boolean-cast
    .pipe(!!gutil.env.invalidate ? invalidate(cloudFrontConfig) : gutil.noop())
    .pipe(publisher.cache())
    .pipe(awspublish.reporter())
    .on('end', () => {
      setTimeout(() => {
        const q = querystring.stringify({ q: meta.url });
        open(`https://developers.facebook.com/tools/debug/sharing/?${q}`);
        open(meta.url);
      }, 1000);
    });
};
