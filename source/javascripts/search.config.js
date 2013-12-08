// Tracking the search results.
//
var trackAnalytics = function(data, query) {
  var total = data.total;
  if (total > 0) {
    _gaq.push(['_trackEvent', 'search', 'with results', query, total]);
  } else {
    _gaq.push(['_trackEvent', 'search', 'not found', query, 0]);
  }
}

$(window).ready(function() {
  var searchInput = $('#search input[type="search"]');
  
  var platformRemoverRegexp = /\b(platform|on\:\w+\s?)+/;
  var platformSelect = $("#results_container div.platform");
  
  // Sets the checkbox labels correctly.
  //
  var selectCheckedPlatform = function() {
    platformSelect.find('label').removeClass('selected');
    platformSelect.find('input:checked + label').addClass('selected');
  };
  
  //
  //
  var resetSearchInterface = function() {
    $('nav.navbar').css("opacity", "1")
    $('#search').removeClass("active");
    $('#results_container').removeClass("active")
    $('#search span.amount').hide();
    $('#search_results div.platform').hide();
    $('#search_results div.allocations').hide();
    $('#search_results div.results').hide();
  };
  
  //
  //
  var prepareSearchInterfaceForResults = function() {
    $('nav.navbar').css("opacity", "0")
    $('#search').addClass("active")
    $('#results_container').addClass("active")
    $('#search span.amount').show();
  };
  
  var resultsSearchInterface = function() {
    $('#search_results div.platform').show();
    $('#search_results div.allocations').show();
    // $('#search div.results').show(); // Picky does this already.
  };
  
  //
  //
  var noResultsSearchInterface = function(query) {
    // $('#search_results .no_results').show(); // Picky does this already.
    $('#search_results div.allocations').hide();
    $('#search_results div.platform').hide();
    
    // Get special no_results hash from the search API:
    //  * autosplit query
    //  * tags
    //
    $.getJSON('http://search.cocoapods.org/no_results.json', 'query=' + query, function(data, textStatus, jqXHR) {
      var suggested_query = data.split[0].join(' ');
      var total = data.split[1];
      
      var splitsContainer = $('#results_container .no_results .splits');
      if (suggested_query && total > 0) {
        splitsContainer.html("<p>We found " + total + " results searching for <a href='javascript:pickyClient.insert(\"" + suggested_query + "\");'>" + suggested_query + "</a>.</p>")
      } else {
        splitsContainer.html('');
      }
      
      var tagsContainer = $('#results_container .no_results .tags');
      var tags = [];
      $.each(data.tag, function(name, amount) {
        tags.push("<a href='javascript:pickyClient.insert(\"tag:" + name + "\");'>" + name + "</a>");
      });
      tagsContainer.html("<p>Maybe it helps exploring via one of our keywords? </p>")
      tagsContainer.find('p').append(tags.sort().join(', ')).append('.');
    });
  };
  
  // Renders an entry, then returns the rendered HTML.
  //
  // TODO Improve. This is just a quick prototype.
  //
  var platformMapping = {
    ios: 'iOS',
    osx: 'OS X'
  };
  var goodSource = /^http/;
  var extractRepoFromSource = function(entry) {
    var link, value;
    var source = entry.source;
    for (var key in source) {
      if (key == 'http') { return ''; }
      
      value = source[key];
      if (value.toString().match(goodSource)) { link = value; break; }
    }
    return link ? '<a href="' + link + '">Repo</a>' : '';
  };
  var render = function(entry) {
    var platform = platformMapping[entry.platforms];
    var authors  = $.map(entry.authors, function(email, name) {
      return '<a href="javascript:pickyClient.insert(\'' + name.replace(/[']/, "\\\\\'") + '\')">' + name + '</a>';
    });
    
    var info_classes = "infos col-lg-8 col-sm-7 col-xs-12"
    var action_classes = "actions col-lg-4 col-sm-5 col-xs-12"
    return '<li class="result">' +
    '  <div class="' + info_classes + '">' +
    '    <h3>' +
    '      <a href="' + entry.link + '">' + entry.id + '</a>' +
    '      <span class="version">' + entry.version + '</span>' +
    '      <img class="copy" src="./images/copy-to-clipboard.png" data-clipboard-text="pod \'' + entry.id + '\', \'~> ' + entry.version + '\'">' +
    '      </img><span class="copy-result flash">Copied!</span><span class="copy-result manual"></span>' +
    (platform ? '<span class="os">' + platform + '</span>' : '') +
    '    </h3>' +
    '    <p class="subspecs">' + entry.subspecs.join(', ') + '</p>' +
    '    <p>' + entry.summary + '</p>' +
    '    <p class="author">' + authors.join(', ') + '</p>' +
    '  </div>' +
    '  <div class="' + action_classes +'">' + "<div class='action-wrapper'>" +
    extractRepoFromSource(entry) +
    '    <a href="http://cocoadocs.org/docsets/' + entry.id + '/' + entry.version + '">Docs</a>' +
    '    <a href="https://github.com/CocoaPods/Specs/tree/master/' + entry.id + '/' + entry.version + '/' + entry.id + '.podspec">Spec</a>' +
    '  </div></div>' +
    '</li>'
  };
  
  pickyClient = new PickyClient({
    full: 'http://search.cocoapods.org/search.json',
    fullResults: 20,
      
    // The live query does a full query.
    //
    live: 'http://search.cocoapods.org/search.json',
    liveResults: 20,
    liveRendered: true, // Experimental: Render live results as if they were full ones.
    liveSearchInterval: 60, // Time between keystrokes before it sends the query.
    maxSuggestions: 5, // Bootstrap currently hides .hidden class using !important, which blocks Picky's behaviour :( (we now use .onrequest)
    alwaysShowResults: true, // Always show results, even when Picky does not know what categories the user wants.
    alwaysShowSelection: true, // Always show the selection of what your search means, even when Picky would not show it normally.
    wrapResults: '<ol class="results"></ol>', // Always wrap the results in an ol.results.

    // Instead of enclosing the search in #picky,
    // in the CocoaPods search we use #search.
    //
    enclosingSelector: '#search',
    resultsSelector: '#search_results div.results',
    noResultsSelector: '#results_container .no_results',
    allocationsSelector: '#search_results div.allocations',
    hiddenAllocations: '#search_results div.allocations .onrequest',
    counterSelector: '#search form span.amount',
    moreSelector: '#search_results .allocations .more',
    
    // Before a query is inserted into the search field
    // we clean it of any platform terms.
    //
    beforeInsert: function(query) {
      if ('' != query) { prepareSearchInterfaceForResults(); }
      return query.replace(platformRemoverRegexp, '');
    },
    // Before Picky sends any data to the server.
    //
    // Adds the platform modifier to it if it isn't there already.
    // Removes it if it is.
    //
    before: function(query, params) {
      // We don't add the platform if it is empty (still saved in history as empty, though).
      //
      if (query == '') { return ''; }
      
      // Otherwise we add in the platform.
      //
      query = query.replace(platformRemoverRegexp, '');
      var platformModifier = platformSelect.find("input:checked").val();
      if (platformModifier === undefined || platformModifier == '') { return query; }
      return platformModifier + ' ' + query;
    },
    success: function(data, query) {
      // Track query for analytics.
      //
      trackAnalytics(data, query);
      
      // If somebody cleared the search input, do not show any results
      // arriving "late" (well, slower than the person can press backspace).
      //
      if ('' == searchInput.val()) { return false; }
      
      // If no results are found.
      //
      if (0 == data.total) {
        noResultsSearchInterface(query);
      } else {
        resultsSearchInterface();
      }
      
      // Render the JSON into HTML.
      //
      var allocations = data.allocations;
      allocations.each(function(i, allocation) {
        allocation.entries = allocation.entries.map(function(i, entry) {
          return render(entry);
        });
      });
      
      return data;
    },
    // After Picky has handled the data and updated the view.
    //
    after: function(data) {
      //
      //
      $('ol.results img.copy').click(function() {
        var text = $(this).attr('data-clipboard-text');
        var info = $(this).siblings('span.copy-result.manual');
        info.html(text);
        info.show();
        // TODO If someone knows how to select text – use your powers here :)
      });
      
      // This will fail if there is no flash.
      //
      var clip = new ZeroClipboard(
        $('ol.results img.copy'),
        {
          moviePath: "./flashes/ZeroClipboard.swf",
          forceHandCursor: true
        }
      );
      clip.on("load", function(client) {
        client.on( "complete", function(client, args) {
          $(this).siblings('span.copy-result.flash').show();
        });
      });
    },

    // This is used to generate the correct query strings, localized. E.g. "subject:war".
    // Note: If you don't give these, the field identifier given in the Picky server is used.
    //
    qualifiers: {
      en:{
        dependencies: 'uses',
        platform: 'on'
      }
    },

    // Use this to group the choices (those are used when Picky needs more feedback).
    // If a category is missing, it is appended in a virtual group at the end.
    // Optional. Default is [].
    //
    // We group platform explicitly, so it is always positioned at
    // the start of the explanation of the choices (also, we can
    // simply not show it).
    //
    groups: [['platform']],
          
    // This is used for formatting inside the choice groups.
    //
    // Use %n$s, where n is the position of the category in the key.
    // Optional. Default is {}.
    //
    choices: {
      en: {
        'platform': '', // platform is simply never shown.
              
        'name': 'name',
        'author': 'author',
        'summary': 'summary',
        'dependencies': 'dependency',
        'tags': 'tag',
        'version': 'version',
        'author,name': 'author+name',
        'name,author': 'name+author',
        'tags,name': 'tag+name',
        'name,tags': 'name+tag',
        'version,name': 'version+name',
        'name,version': 'name+version',
        'name,dependencies': 'name+dependency',
        'dependencies,name': 'dependency+name',
        'author,dependencies': 'author+dependency',
        'dependencies,author': 'dependency+author',
        'dependencies,version': 'dependency+version',
        'version,dependencies': 'version+dependency',
        'author,version': 'author+version',
        'version,author': 'version+author',
        'summary,version': 'version+summary',
        'version,summary': 'version+summary',
        'summary,name': 'summary+name',
        'name,summary': 'name+summary',
        'summary,author': 'summary+author',
        'author,summary': 'author+summary',
        'summary,dependencies': 'summary+dependency',
        'dependencies,summary': 'dependency+summary',
        'name,dependencies': 'name+dependency',
        'dependencies,name': 'dependency+name'
      }
    },

    // This is used to explain the preceding word in the suggestion text (if it
    // has not yet been defined by the choices above), localized. E.g. "Peter (author)".
    // Optional. Default are the field identifiers from the Picky server.
    //
    explanations: {
      en: {
        author: 'written by',
        versions: 'on version',
        dependencies: 'using',
        name: 'named',
        platform: 'only on',
        summary: 'with summary',
        tags: 'tagged as'
      }
    }
  });
  
  // Reset the search if empty.
  // TODO Use the "search" Event? Also, rewrite.
  //
  searchInput.on('input', function(e) {
    if ('' == this.value) {
      resetSearchInterface();
    } else {
      prepareSearchInterfaceForResults();
    }
  });

  // Resend query on platform selection.
  //
  // Note: Also updates the label.
  //
  platformSelect.find('input').bind('change', function(event) {
    pickyClient.resend();
    selectCheckedPlatform();
    $("#pod_search").focus();
  });

  // Initially select the right platform.
  //
  selectCheckedPlatform();

  // Initially insert the query given in the URL
  // if there is one.
  //
  if (window.initial_query != "") {
    pickyClient.insertFromURL(window.initial_query);
  }
  
  // Make all clicks in the search container set focus.
  // 
  $('#search_container').on('click', function (e) {
    $('#search_container input').focus();
  });
  
  // Keyboard handling.
  //
  // Currently, we only handle keyboard selecting the first result category set.
  // Use a smarter selector than next and prev for hopping into the next/previous category set
  // (so make nextResult and previousResult smarter).
  //
  // Also, we do not handle the case where the selection goes out of view.
  //
  var nextResult = function(selected){
    return selected.next();
  }
  var previousResult = function(selected){
    return selected.prev();
  }
  var selectResult = function(provideNext) {
    var results = $('ol.results li.result');
    var selected = results.closest('.selected').first();
    if (selected.length > 0) {
      selected.removeClass('selected');
      selected = provideNext(selected);
    } else {
      selected = results.first();
    }
    selected.addClass('selected');
  }
  var openSelection = function(){
    var selected = $('ol.results li.result.selected').first();
    if (selected.length > 0) {
      window.document.location.href = selected.find('a').first().attr('href');
    }
  }
  
  // Install keyboard handling.
  //
  $('body').keydown(function(event) {
    switch (event.keyCode) {
      // Down
      //
      case 40:
          selectResult(nextResult)
          break;
      
      // Up
      //
      case 38:
          selectResult(previousResult);
          break;

      // Enter
      //
      case 13:
          openSelection();
          break;
    }
  });
});
