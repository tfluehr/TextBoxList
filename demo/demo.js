var demos = {};
var demoData = null;
function autocomplete(){
      top.console.log('hi');
  demos.autocomplete = new TextboxList('autocompleteDemo', {
    url: '../demo/demoData.js',
    hintMessage: 'This is a simple Auto Complete Textbox List'
  });
}


function activateDemos(){
  autocomplete();
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
