var demos = {};
var demoData = null;
function autocomplete(){
      top.console.log('hi');
  demos.autocomplete = new TextboxList('autocompleteDemo', {
    url: 'demoData.js'
  });
}


function activateDemos(){
  autocomplete();
}

document.observe('dom:loaded', function(){
  new Ajax.Request('demoData.js', {
    method: 'get',
    onSuccess: function(transport){
      demoData = transport.responseText.evalJSON(true);
      activateDemos.defer();
    }
  });
});
