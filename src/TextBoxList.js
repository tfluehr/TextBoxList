/*!
 Prototype based Text Box List
 http://tfluehr.com
 
 Copyright (c) 2010 Timothy Fluehr tim@tfluehr.com
 
 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:
 
 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
 
 If you do choose to use this,
 please drop me an email at tim@tfluehr.com
 I would like to see where this ends up :)
 */
/*
 *  Credits:
 *  - Idea: Facebook + Apple Mail
 *  - Caret position method: Diego Perini <http://javascript.nwbox.com/cursor_position/cursor.js>
 *  - Guillermo Rauch: Original MooTools script
 *  - Ran Grushkowsky/InteRiders Inc. : Porting into Prototype and further development <http://interiders.com/>
 *  - Tim Fluehr: Rewrite/modifications <http://www.tfluehr.com>
 */
(function(){
  var REQUIRED_PROTOTYPE = '1.6.1';
  var checkRequirements = function(){
    function convertVersionString(versionString){ // taken from script.aculo.us
      var v = versionString.replace(/_.*|\./g, '');
      v = parseInt(v + '0'.times(4 - v.length), 10);
      return versionString.indexOf('_') > -1 ? v - 1 : v;
    }
    if ((typeof Prototype == 'undefined') ||
    (typeof Element == 'undefined') ||
    (typeof Element.Methods == 'undefined') ||
    (convertVersionString(Prototype.Version) <
    convertVersionString(REQUIRED_PROTOTYPE))) {
      throw ("ProtoCloud requires the Prototype JavaScript framework >= " +
      REQUIRED_PROTOTYPE +
      " from http://prototypejs.org/");
    }
  };
  checkRequirements();
  
  var ResizableTextbox = Class.create({
    // I think this is for the invisible text box you type into for auto complete
    initialize: function(element, options){
      this.options = Object.extend({
        min: 5,
        max: 500,
        step: 7
      }, options);
      this.el = $(element);
      this.width = this.el.offsetWidth;
      this.el.observe('keyup', (function(ev){
        var newsize = this.options.step * $F(this.el).length;
        if (newsize <= this.options.min) {
          newsize = this.width;
        }
        if (!($F(this.el).length == this.el.retrieve('rt-value') || newsize <= this.options.min || newsize >= this.options.max)) {
          this.el.setStyle({
            'width': newsize
          });
        }
      }).bind(this));
      this.el.observe('keydown', (function(ev){
        this.el.store('rt-value', $F(this.el).length);
      }).bind(this));
    }
  });
  var TextboxLists = $H(); // for caching instances so we only need to add one set of observers for keyup and click
  document.observe('dom:loaded', function(ev){
    document.observe('keyup', (function(ev){
      var list = ev.findElement('.TextboxList');
      if (list) {
        TextboxLists.get(list.identify()).keyup(ev);
      }
    }).bind(this));
    document.observe('click', function(ev){
      if (ev.isLeftClick()) {
        var el = ev.findElement('.TextboxList, .TextboxListAutoComplete');
        if (el && el.match('.TextboxListAutoComplete')){
          el = $(el.retrieve('parentTextboxList'));
        }
        if (el) {
          TextboxLists.get(el.identify()).click(ev);
        }
        else { // not in TextBoxList so hide all
          TextboxLists.each(function(item){
            item.value.blur();
          });
        }
      }
    });
  });
  TextboxList = Class.create({
    initialize: function(element, options, data){
      this.options = Object.deepExtend({
        autoComplete: {
          url: null,
          opacity: 0.8, // opacity of drop down
          limitResults: false,
          maxresults: 10, // max results to display in drop down
          minchars: 1, // min characters to show dropdown
          noResultsMessage: 'No values found',
          message: '&nbsp;', // message to be displayed 
          showMessage: false, // whether to show the message on focus
          requestDelay: 0.3, // delay (in seconds) after last keypress before sending request.
          parent: document.body,
          startsWith: false,
          regExp: options.autoComplete && options.autoComplete.startsWith ? '^{0}' : '{0}',
          avoidKeys: [Event.KEY_UP, Event.KEY_DOWN, Event.KEY_LEFT, Event.KEY_RIGHT, Event.KEY_RETURN, Event.KEY_ESC]
        },
        className: 'bit',
        results: 10,
        uniqueValues: true
      }, options);
      
      this.input = $(element).hide();
      
      this.bits = new Hash();
      this.events = new Hash();
      this.current = false;
      this.setupMainElements();
      this.makeResizable(this.mainInput);
      this.setupAutoComplete();
      this.setupEvents();
      this.data = data || [];
      var tempItems = (this.input.getValue().empty() ? [] : this.input.getValue().evalJSON());
      // create initial items
      tempItems.each(this.addItem, this);
    },
    setupEvents: function(){
      this.setupContainerEvents();
      this.setupMainInputEvents();
      this.setupAutoCompleteEvents();
    },
    keyup: function(ev){
      if (!this.current) {
        this.current = this.mainInput;
      }
      this.dosearch = false;
      switch (ev.keyCode) {
        case Event.KEY_LEFT:
          if (!this.resultsshown) { // auto complete not visible - highlite selected item to left if it exists
            return this.move('left');
          }
          break;
        case Event.KEY_RIGHT:
          if (!this.resultsshown) {
            return this.move('right');// auto complete not visible - highlite selected item to right (or input box) if it exists
          }
          break;
        case Event.KEY_DELETE:
        case Event.KEY_BACKSPACE:
          if (!this.resultsshown) {
            return this.moveDispose();// auto complete not visible - delete highlited item if exists
          }
          else if (this.mainInput.value.empty()) {
            this.lastRequestValue = null;
            this.autoHide();// auto complete visible and input empty so hide auto complete
          }
          else {
            this.dosearch = true; // activate auto complete lookup
          }
          break;
        case Event.KEY_UP:
          if (this.resultsshown) {
            ev.stop();
            return this.autoMove('up');// auto complete visible move highlite up.
          }
          break;
        case Event.KEY_DOWN:
          if (this.resultsshown) {
            ev.stop();
            return this.autoMove('down');// auto complete visible move highlite down.
          }
          break;
        case Event.KEY_RETURN:
          if (this.resultsshown) {
            ev.stop();// auto complete visible select highlited item
            this.autoAdd(this.autocurrent);
            this.autocurrent = false;
          }
          break;
        case Event.KEY_ESC:
          if (this.resultsshown) {
            this.autoHide();// auto complete visible - hide it and clear the input.
            if (this.current) {
              this.lastRequestValue = null;
              this.mainInput.clear();
            }
          }
          break;
        default:
          this.dosearch = true;// default activate auto complete search
          break;
      }
      if (this.dosearch) {
        this.focus(this.mainInput);// make sure input has focus
        if (this.mainInput.value.empty() &&
        this.options.autoComplete.avoidKeys.find(function(item){
          return item === ev.keyCode;
        })) {
          return;// if input is empty and keyCode is in ignore list the abort search
        }
        if (this.options.autoComplete.url !== null)// ajax auto complete
        {
          clearTimeout(this.fetchRequest);
          this.fetchRequest = (function(){
            if (this.mainInput.value != this.lastRequestValue) { // only send request if value has changed since last request
              this.lastRequestValue = this.mainInput.value;
              if (!this.mainInput.value.empty()) {
                new Ajax.Request(this.options.autoComplete.url, {
                  parameters: {
                    SearchValue: this.mainInput.value
                  },
                  method: 'get',
                  onSuccess: (function(transport){
                    this.data = transport.responseText.evalJSON(true);
                    //                    transport.responseText.evalJSON(true).each((function(t){
                    //                      this.autoFeed(t);
                    //                    }).bind(this));
                    this.autoShow(this.mainInput.value);
                  }).bind(this)
                });
              }
            }
          }).bind(this).delay(this.options.autoComplete.requestDelay); // delay request by "options.autoComplete.requestDelay" seconds to wait for user to finish typing
        }
        else {
          this.autoShow(this.mainInput.value); // non ajax so use local data for auto complete
        }
      }
    },
    click: function(ev){
      var el;
      if ((el = ev.findElement('.auto-item'))) { // click on auto complete item
        ev.stop();
        this.autoAdd(el);
      }
      else if ((el = ev.findElement('.closebutton'))) { // x for removing a selected item
        ev.stop();
        if (!this.current) {
          this.focus(this.mainInput);
        }
        this.removeElement(el.up('li'));
        return;
      }
      else if ((el = ev.findElement('.' + this.options.className + '-box'))) { // clicked on a selected item (not the x)
        ev.stop();
        this.focus(el);
      }
      else if (this.mainInput != this.current) { // clicked anywhere else so focus the text box for typing
        this.focus(this.mainInput);
      }
    },
    setupContainerEvents: function(){
      this.holder.observe('mouseover', (function(ev){
        var el; // add classname on hover-in (not using :hover because of keyboard support)
        if ((el = ev.findElement('.' + this.options.className + '-box'))) {
          el.addClassName('bit-hover');
        }
      }).bind(this));
      this.holder.observe('mouseout', (function(ev){
        var el;// remove classname on hover-out (not using :hover because of keyboard support)
        if ((el = ev.findElement('.' + this.options.className + '-box'))) {
          el.removeClassName('bit-hover');
        }
      }).bind(this));
    },
    setupMainInputEvents: function(){
      this.mainInput.observe(Prototype.Browser.IE ? 'keydown' : 'keypress', (function(ev){
        if (this.resultsshown && Event.KEY_RETURN == ev.keyCode) {
          ev.stop(); // auto complete visible so stop on Return to prevent form submit
        }
      }).bind(this));
      this.mainInput.observe('blur', this.blur.bind(this, false));
      this.mainInput.observe('focus', this.focus.bindAsEventListener(this, false));
      this.mainInput.observe('keydown', function(ev){
        this.store('lastvalue', this.value).store('lastcaret', this.getCaretPosition());
      });
    },
    setupAutoCompleteEvents: function(){
      this.autoresults.observe('mouseover', (function(ev){
        var el = ev.findElement('.auto-item');
        if (el) {
          this.autoFocus(el);
        }
        this.curOn = true;
      }).bind(this));
      this.autoresults.observe('mouseout', (function(){
        this.curOn = false;
      }).bind(this));
    },
    /*
     * Create/rearrage required elements for the text input box
     */
    setupMainElements: function(){
      this.container = new Element('div', { // container to hold all controls
        'class': 'TextboxList'
      });
      TextboxLists.set(this.container.identify(), this);
      
      this.holder = new Element('ul', { // hold the input and all selected items
        'class': 'holder'
      }).insert(this.createInput({ // input to type into
        'class': 'maininput'
      }));
      this.input.insert({
        'before': this.container
      });
      this.container.insert(this.holder);
      this.container.insert(this.input);
    },
    /*
     * Create required elements for the autocomplete
     */
    setupAutoComplete: function(){
      var autoholder = new Element('div', {
        'class': 'TextboxListAutoComplete'
      }).hide().store('parentTextboxList', this.container.identify());
      this.autoMessage = new Element('div', { // message to display before user types anything
        'class': 'ACMessage'
      }).update(this.options.autoComplete.message).hide();
      this.autoNoResults = new Element('div', { // message to display when no autocomplete results
        'class': 'ACMessage'
      }).update(this.options.autoComplete.noResultsMessage).hide();
      autoholder.insert(this.autoMessage);
      autoholder.insert(this.autoNoResults);
      this.autoresults = new Element('ul').hide();
      
      autoholder.insert(this.autoresults);
      $(this.options.autoComplete.parent).insert(autoholder);
      
      this.autoholder = autoholder.setOpacity(this.options.autoComplete.opacity);
    },
    getId: function(){
      var id;
      do {
        id = 'anonymous_element_' + Element.idCounter++;
      }
      while ($(id));
      return id;
    },
    
    /*
     * Add a single item to the text list
     * val: Object { content: '', val: ''}
     */
    addItem: function(val){
      var id = this.getId();
      var el = this.createBox(val, {
        'id': id
      });
      (this.current || this.mainInput).insert({
        'before': el
      });
      this.bits.set(id, val);
      this.updateInputValue();
      return el;
    },
    /*
     * update the source input box with current values
     * Set as a JSON string
     */
    updateInputValue: function(){
      this.input.setValue(Object.toJSON(this.bits.values()));
    },
    /*
     * Remove a single item from the text list
     * el: Element - the element to remove
     */
    removeElement: function(el){
      this.bits.unset(el.id);
      if (this.current == el) {
        this.focus(el.next());
      }
      this.autoFeed(el.retrieve('value'));
      
      el.stopObserving().remove();
      this.updateInputValue();
      return this;
    },
    removeItem: function(obj, all){
      var id, foundObj;
      if (typeof(obj.value) != 'undefined' &&
      typeof(obj.caption) != 'undefined') {
        foundObj = this.bits.findAll(function(item){
          return item.value.value === obj.value && item.value.caption === obj.caption;
        });
      }
      else if (typeof(obj.caption) != 'undefined') {
        foundObj = this.bits.findAll(function(item){
          return item.value.caption === obj.caption;
        });
      }
      else if (typeof(obj.value) != 'undefined') {
        foundObj = this.bits.findAll(function(item){
          return item.value.value === obj.value;
        });
      }
      if (foundObj && foundObj.length > 0) {
        if (all) {
          foundObj.each(function(item){
            this.removeElement($(item.key));
          }, this);
          return foundObj;
        }
        else {
          this.removeElement($(foundObj.first().key));
          return foundObj.first();
        }
      }
    },
    focus: function(el, nofocus){
      if (typeof(el.element) == 'function') {
        el = el.element();
      }
      if (el != this.container) {
        if (this.current == el) {
          return this;
        }
        this.blur();
        if (el == this.mainInput) {
          this.autoShow(this.mainInput.value);
        }
        el.addClassName(this.options.className + '-' + el.retrieve('type') + '-focus');
        if (!nofocus) {
          this.callEvent(el, 'focus');
        }
        this.current = el;
        return this;
      }
      else {
        this.callEvent(this.mainInput, 'focus');
      }
    },
    
    blur: function(noblur){
      if (!this.current) {
        return this;
      }
      if (this.current == this.mainInput) {
        if (!noblur) {
          this.callEvent(this.mainInput, 'blur');
        }
        this.inputBlur(this.mainInput);
      }
      this.current.removeClassName(this.options.className + '-' + this.current.retrieve('type') + '-focus');
      this.current = false;
      return this;
    },
    inputBlur: function(el){
      if (!this.curOn) {
        this.blurhide = this.autoHide.bind(this).delay(0.1);
      }
    },
    
    createBox: function(val, options){
      var li = new Element('li', Object.extend(options, {
        'class': this.options.className + '-box'
      })).update(val.caption).store('type', 'box');
      var a = new Element('a', {
        'href': '#',
        'class': 'closebutton'
      });
      li.insert(a).store('value', val);
      return li;
    },
    
    createInput: function(options){
      return this.createInputLI(options);
    },
    
    createInputLI: function(options){
      var li = new Element('li', {
        'class': this.options.className + '-input'
      });
      this.mainInput = new Element('input', Object.extend(options, {
        'type': 'text'
      }));
      li.store('type', 'input').insert(this.mainInput);
      return li;
    },
    
    callEvent: function(el, type){
      if (el.match('input')) {
        el.setStyle({
          opacity: 1
        });
      }
      else {
        this.mainInput.setStyle({
          opacity: 0
        });
      }
      if (type == 'focus') {
        this.mainInput.focus();
      }
    },
    
    isSelfEvent: function(type){
      return (this.events.get(type)) ? !!this.events.unset(type) : false;
    },
    
    makeResizable: function(li){
      this.mainInput.store('resizable', new ResizableTextbox(this.mainInput, {
        min: this.mainInput.offsetWidth,
        max: (this.input.getWidth() ? this.input.getWidth() : 0)
      }));
      return this;
    },
    
    checkInput: function(){
      return (!this.mainInput.retrieve('lastvalue') || (this.mainInput.getCaretPosition() === 0 && this.mainInput.retrieve('lastcaret') === 0));
    },
    
    move: function(direction){
      var el = this.current[(direction == 'left' ? 'previous' : 'next')]();
      if (el && (this.checkInput() || direction == 'right')) {
        this.focus(el);
      }
      return this;
    },
    
    moveDispose: function(){
      if (this.current.retrieve('type') == 'box') {
        this.removeElement(this.current);
      }
      else if (this.checkInput() && this.bits.keys().length && this.current.previous()) {
        this.focus(this.current.previous());
      }
      this.autoPosition();
    },
    autoShow: function(search){
      this.autoPosition();
      this.autoholder.show();
      this.autoholder.descendants().each(function(ev){
        ev.hide();
      });
      if (!search || !search.strip() || (!search.length || search.length < this.options.autoComplete.minchars)) {
        if (this.options.autoComplete.showMessage) {
          this.autoMessage.show();
        }
        this.resultsshown = false;
      }
      else {
        this.resultsshown = true;
        this.autoresults.show().update('');
        var count = 0;
        var regExp = new RegExp(this.options.autoComplete.regExp.replace('{0}', search), 'i');
        this.data.filter(function(obj){
          var returnVal = obj ? regExp.test(obj.caption) : false;
          if (returnVal && this.options.uniqueValues) {
            returnVal = !this.bits.find(function(item){
              return item.value.caption === obj.caption;
            });
          }
          return returnVal;
        }, this).each(function(result, ti){
          count++;
          if (this.options.autoComplete.limitResults && ti >= this.options.autoComplete.maxresults) {
            return;
          }
          var el = new Element('li', {
            'class': 'auto-item'
          });
          el.update(this.autoHighlight(result.caption, regExp));
          this.autoresults.insert(el);
          el.store('result', result);
          if (ti === 0) {
            this.autoFocus(el);
          }
        }, this);
        if (count === 0) {
          this.autoNoResults.show();
        }
        
      }
//      if (count > this.options.results) {
//        this.autoresults.setStyle({
//          'height': (this.options.results * 24) + 'px'
//        });
//      }
//      else {
//        this.autoresults.setStyle({
//          'height': (count ? (count * 24) : 0) + 'px'
//        });
//      }
      return this;
    },
    
    autoHighlight: function(html, highlight){
      return html.gsub(highlight, function(match){
        return '<em>' + match[0] + '</em>';
      });
    },
    
    autoHide: function(){
      this.resultsshown = false;
      this.autoholder.hide();
      return this;
    },
    
    autoFocus: function(el){
      if (!el) {
        return;
      }
      if (this.autocurrent) {
        this.autocurrent.removeClassName('auto-focus');
      }
      this.autocurrent = el.addClassName('auto-focus');
    },
    
    autoMove: function(direction){
      if (!this.resultsshown) {
        return;
      }
      this.autoFocus(this.autocurrent[(direction == 'up' ? 'previous' : 'next')]());
      this.autoresults.scrollTop = this.autocurrent.positionedOffset()[1] - this.autocurrent.getHeight();
      return this;
    },
    
    autoFeed: function(val){
      if (!this.data.find(function(item){
        return item.caption === val.caption;
      })) {
        this.data.push(val);
      }
      return this;
    },
    
    autoAdd: function(el){
      if (!el || !el.retrieve('result')) {
        return;
      }
      this.addItem(el.retrieve('result'));
      delete this.data[this.data.indexOf(Object.toJSON(el.retrieve('result')))];
      this.autoHide();
      this.lastRequestValue = null;
      this.mainInput.clear().focus();
      return this;
    },
    autoPosition: function(){
      var contOffset = this.holder.viewportOffset();
      var parentOffset = this.options.autoComplete.parent.viewportOffset();
      contOffset.top = contOffset.top - parentOffset.top;
      contOffset.left = contOffset.left - parentOffset.left;
      this.autoholder.setStyle({
        left: contOffset.left+'px',
        top: (contOffset.top+this.container.getHeight())+'px',
        width: this.holder.getWidth()+'px'
      });
// dynamically set max depending on avail space?
// would also scroll parent as needed?      
//      this.options.autoComplete.maxresults = parseInt(($(this.options.autoComplete.parent).getHeight()/this.container.getHeight())/2,10);
//      top.console.log(this.options.autoComplete.maxresults);
      
    }
  });
  
  //helper functions 
  Element.addMethods({
    getCaretPosition: function(){
      if (this.createTextRange) {
        var r = document.selection.createRange().duplicate();
        r.moveEnd('character', this.value.length);
        if (r.text === '') {
          return this.value.length;
        }
        return this.value.lastIndexOf(r.text);
      }
      else {
        return this.selectionStart;
      }
    }
  });
  if (typeof(Object.deepExtend) == 'undefined') {
    Object.deepExtend = function(destination, source){
      for (var property in source) {
        if (source[property] && source[property].constructor &&
        source[property].constructor === Object) {
          destination[property] = destination[property] || {};
          arguments.callee(destination[property], source[property]);
        }
        else {
          destination[property] = source[property];
        }
      }
      return destination;
    };
  }
  
})();
