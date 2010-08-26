var demos = {};
var demoData = null;
function autocompleteUrlDemo(){
  demos.autocompleteUrlDemo = new TextboxList('autocompleteUrlDemo', {
    url: '../demo/demoData.js',
    hintMessage: 'This is a simple Auto Complete Textbox List searching/loading data from a url'
  });
}
function autocompleteLocalDemo(){
  demos.autocompleteLocalDemo = new TextboxList('autocompleteLocalDemo', {
    hintMessage: 'This is a simple Auto Complete Textbox List with it\'s data provided in an array and some values automatically selected'
  }, demoData);
}

function activateDemos(){
  autocompleteUrlDemo();
  autocompleteLocalDemo();
}
document.observe('dom:loaded', function(){
  new Ajax.Request('../demo/demoData.js', {
    method: 'get',
    onSuccess: function(transport){
      demoData = transport.responseText.evalJSON(true);
      activateDemos.defer();
      $('submitBtn').observe('click', function(){
        $H(demos).each(function (tbl){
          tbl.value.container.next('.SubmitCode').update($F(tbl.value.input)).setStyle({display: 'block'}).previous('.SubmitInfo').update('Form Value:').setStyle({display: 'block'});
        });
      });
    }
  });
});
