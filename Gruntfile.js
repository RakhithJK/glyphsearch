module.exports = function(grunt) {
  grunt.initConfig({
    'merge-json': {
      icons: {
          src: [ "data/icons-*.json" ],
          dest: "data/icons.json"
      }
    },
    'compile-handlebars': {
      remote: {
        template: 'templates/batch.handlebars',
        templateData: 'data/icons.json',
        output: 'data/batch.json'
      }
    }
  });

  grunt.loadNpmTasks('grunt-merge-json');
  grunt.loadNpmTasks('grunt-compile-handlebars');

  grunt.registerTask('default', function(){
    grunt.task.run('build');
  });

  grunt.registerTask('build', ['merge-json', 'compile-handlebars']);

  grunt.registerTask('index', 'Push batch.json to Algolia\'s server', function() {

    // --- Step 0: required Algolia api key

    var personalApiKey = grunt.option('apikey');

    if (!personalApiKey) {
      grunt.log.write("Checking API key...").error();
      grunt.log.write("Please provide a valid API key with option --apikey");
      return;
    }

    // this task is async
    var done = this.async();


    // --- Step 1: init Algolia API client

    var init = grunt.log.write("Initialize Algolia's client...");

    var Algolia = require('algolia-search');
    var client = new Algolia('9JQV0RIHU0', personalApiKey);

    init.ok();


    // --- Step 2: prepare Algolia index

    var prepare = grunt.log.write("Clearing index...");

    client.deleteIndex('icons');

    var index = client.initIndex('icons');

    index.setSettings({
      'attributesToIndex': ["name", "tags", "unicode"],
      'customRanking': ["asc(name)"],
      'queryType': 'prefixAll'
    });

    prepare.ok();


    // --- Step 3: push data to Algolia

    var push = grunt.log.write("Push batch.json...");

    index.addObjects(require('./data/batch.json'), function(error, content) {
      if (error) {
        push.error();
        done(false);
      } else {
        push.ok();
        done();
      }
    });

  });

  grunt.registerTask('map-unicodes-for-material-icons', function() {
    var done = this.async();

    var materialIconsData = require('./data/icons-material.json')
    var materialIconsString = JSON.stringify(materialIconsData);

    var fontCodepoints = grunt.file.readJSON('./bower_components/material-design-icons-iconfont/dist/fonts/MaterialIcons-Regular.json');
    var fontCodepointsMap = {}

    Object.keys(fontCodepoints).forEach((name) => {
      let unicode = fontCodepoints[name].toLowerCase()
      fontCodepointsMap['' + name] = unicode;

      if (materialIconsString.indexOf(name) < 0) {
        materialIconsData.material.push({'name': name, 'tags': ''});
      }
    });

    materialIconsData.material.forEach(function(item) {
      item.unicode = fontCodepointsMap[item.name];
    });

    materialIconsData.material.sort((a, b) => {
      if ( a.name < b.name ){
        return -1;
      }
      if ( a.name > b.name ){
        return 1;
      }
      return 0;
    });

    // console.log('OUT', materialIconsData);

    grunt.file.write('./data/icons-material.json', JSON.stringify(materialIconsData, null, 2));

    done();
  });

};
