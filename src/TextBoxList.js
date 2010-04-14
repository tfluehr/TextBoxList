/*!
 Prototype based override of form.submit
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
  document.observe('keyup', (function(ev){
    var list = ev.findElement('.TextboxList');
    if (list) {
      var listObj = TextboxLists.get(list.identify());
      if (listObj) {
        if (ev.keyCode == Event.KEY_BACKSPACE) {
          ev.stop();
        }
        if (!listObj.current) {
          listObj.current = listObj.mainInput;
        }
        switch (ev.keyCode) {
          case Event.KEY_LEFT:
            return listObj.move('left');
          case Event.KEY_RIGHT:
            return listObj.move('right');
          case Event.KEY_DELETE:
          case Event.KEY_BACKSPACE:
            return listObj.moveDispose();
        }
      }
    }
  }).bind(this));
  document.observe('click', function(ev){
    if (!ev.findElement('.TextboxList')) {
      TextboxLists.each(function(item){
        item.value.blur();
      });
    }
  });
  TextboxList = Class.create({
    initialize: function(element, options, data){
      this.options = Object.deepExtend({
        autoComplete: {
          opacity: 0.8, // opacity of drop down
          maxresults: 10, // max results to display in drop down
          minchars: 1, // min characters to show dropdown
          message: '&nbsp;', // message to be displayed 
          showMessage: false, // whether to show the message on focus
          requestDelay: 0.3, // delay (in seconds) after last keypress before sending request.
          avoidKeys: [Event.KEY_UP, Event.KEY_DOWN, Event.KEY_LEFT, Event.KEY_RIGHT, Event.KEY_RETURN, Event.KEY_ESC]
        },
        className: 'bit',
        hideempty: true,
        fetchFile: undefined,
        results: 10,
        wordMatch: false,
        uniqueValues: true
      }, options);
      
      this.input = $(element).hide();
      
      this.bits = new Hash();
      this.events = new Hash();
      this.count = 0;
      this.current = false;
      this.setupMainElements();
      this.makeResizable(this.mainInput);
      this.setupAutoComplete();
      this.setupEvents();
      this.data = data || (this.input.getValue().empty() ? [] : this.input.getValue().evalJSON());
      // create initial items
      this.data.each(this.addItem, this);
    },
    setupEvents: function(){
      this.setupContainerEvents();
      this.setupMainInputEvents();
      this.setupAutoCompleteEvents();
    },
    setupContainerEvents: function(){
      this.holder.observe('click', (function(ev){
        var el;
        if ((el = ev.findElement('.closebutton'))) { // x for removing a selected item
          ev.stop();
          if (!this.current) {
            this.focus(this.mainInput);
          }
          this.removeItem(el.up('li'));
          return;
        }
        if ((el = ev.findElement('.' + this.options.className + '-box'))) { // clicked on a selected item (not the x)
          ev.stop();
          this.focus(el);
        }
        else if (this.mainInput != this.current) { // clicked anywhere else so focus the text box for typing
          this.focus(this.mainInput);
        }
      }).bind(this));
      this.holder.observe('mouseover', (function(ev){
        var el;
        if ((el = ev.findElement('.' + this.options.className + '-box'))) {
          el.addClassName('bit-hover');
        }
      }).bind(this));
      this.holder.observe('mouseout', (function(ev){
        var el;
        if ((el = ev.findElement('.' + this.options.className + '-box'))) {
          el.removeClassName('bit-hover');
        }
      }).bind(this));
    },
    setupMainInputEvents: function(){
      this.mainInput.observe('keydown', (function(e){
        this.dosearch = false;
        switch (e.keyCode) {
          case Event.KEY_UP:
            e.stop();
            return this.autoMove('up');
          case Event.KEY_DOWN:
            e.stop();
            return this.autoMove('down');
          case Event.KEY_RETURN:
            e.stop();
            if (!this.autocurrent) {
              break;
            }
            this.autoAdd(this.autocurrent);
            this.autocurrent = false;
            this.autoenter = true;
            break;
          case Event.KEY_ESC:
            this.autoHide();
            if (this.current) {
              this.mainInput.clear();
            }
            break;
          default:
            this.dosearch = true;
        }
      }).bind(this));
      this.mainInput.observe('keyup', (function(e){
        if (this.mainInput.value.empty() &&
        this.options.autoComplete.avoidKeys.find(function(item){
          return item === e.keyCode;
        })) {
          return;
        }
        if (!Object.isUndefined(this.options.fetchFile) &&
        this.mainInput.value != this.lastRequestValue) {
          clearTimeout(this.fetchRequest);
          this.fetchRequest = (function(){
            this.lastRequestValue = this.mainInput.value;
            new Ajax.Request(this.options.fetchFile, {
              parameters: {
                keyword: this.mainInput.value
              },
              method: 'get',
              onSuccess: (function(transport){
                transport.responseText.evalJSON(true).each((function(t){
                  this.autoFeed(t);
                }).bind(this));
                this.autoShow(this.mainInput.value);
              }).bind(this)
            });
          }).bind(this).delay(this.options.autoComplete.requestDelay);
        }
        else if (this.dosearch) {
          this.autoShow(this.mainInput.value);
        }
      }).bind(this));
      this.mainInput.observe(Prototype.Browser.IE ? 'keydown' : 'keypress', (function(e){
        if (this.autoenter) {
          e.stop();
        }
        this.autoenter = false;
      }).bind(this));
      this.mainInput.observe('blur', this.blur.bind(this, false));
      this.mainInput.observe('keydown', function(e){
        this.store('lastvalue', this.value).store('lastcaret', this.getCaretPosition());
      });
    },
    setupAutoCompleteEvents: function(){
      this.autoresults.observe('click', (function(ev){
        var el = ev.findElement('.auto-item');
        if (el) {
          ev.stop();
          this.autoAdd(el);
        }
      }).bind(this));
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
        'class': 'AutoComplete'
      }).hide();
      this.autoMessage = new Element('div', { // message to display before user types anything
        'class': 'ACMessage'
      }).update(this.options.autoComplete.message).hide();
      autoholder.insert(this.autoMessage);
      this.autoresults = new Element('ul').hide();
      
      autoholder.insert(this.autoresults);
      this.container.insert(autoholder);
      this.autoholder = autoholder.setOpacity(this.options.autoComplete.opacity);
    },
    
    /*
     * Add a single item to the text list
     * val: Object { content: '', val: ''}
     */
    addItem: function(val){
      var id = this.options.className + '-' + this.count++;
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
    removeItem: function(el){
      this.bits.unset(el.id);
      if (this.current == el) {
        this.focus(el.next());
      }
      this.autoFeed(el.retrieve('value'));
      
      el.stopObserving().remove();
      this.updateInputValue();
      return this;
    },
    focus: function(el, nofocus){
      if (!this.current) {
            //        el.fire('focus');
      }
      else if (this.current == el) {
        return this;
      }
      this.blur();
      el.addClassName(this.options.className + '-' + el.retrieve('type') + '-focus');
      if (el == this.mainInput) {
        this.autoShow();
      }
      if (!nofocus) {
        this.callEvent(el, 'focus');
      }
      this.current = el;
      return this;
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
      console.log(el, type);
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
      this.mainInput[type]();
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
        return this.removeItem(this.current);
      }
      if (this.checkInput() && this.bits.keys().length && this.current.previous()) {
        return this.focus(this.current.previous());
      }
    },
    autoShow: function(search){
      this.autoholder.show();
      this.autoholder.descendants().each(function(e){
        e.hide();
      });
      if (!search || !search.strip() || (!search.length || search.length < this.options.autoComplete.minchars)) {
        if (this.options.autoComplete.showMessage) {
          this.autoMessage.show();
        }
        this.resultsshown = false;
      }
      else {
        this.resultsshown = true;
        this.autoMessage.hide();
        this.autoresults.setStyle({
          'display': 'block'
        }).update('');
        var regexp;
        if (this.options.wordMatch) {
          regexp = new RegExp("(^|\\s)" + search, 'i');
        }
        else {
          regexp = new RegExp(search, 'i');
        }
        var count = 0;
        this.data.filter(function(obj){
          var returnVal = obj ? regexp.test(obj.caption) : false;
          if (returnVal && this.options.uniqueValues) {
            returnVal = !this.bits.find(function(item){
              return item.value.caption === obj.caption;
            });
          }
          return returnVal;
        }, this).each(function(result, ti){
          count++;
          if (ti >= this.options.autoComplete.maxresults) {
            return;
          }
          var el = new Element('li', {
            'class': 'auto-item'
          });
          el.update(this.autoHighlight(result.caption, search));
          this.autoresults.insert(el);
          el.store('result', result);
          if (ti === 0) {
            this.autoFocus(el);
          }
        }, this);
      }
      if (count > this.options.results) {
        this.autoresults.setStyle({
          'height': (this.options.results * 24) + 'px'
        });
      }
      else {
        this.autoresults.setStyle({
          'height': (count ? (count * 24) : 0) + 'px'
        });
      }
      return this;
    },
    
    autoHighlight: function(html, highlight){
      return html.gsub(new RegExp(highlight, 'i'), function(match){
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
      this.mainInput.clear().focus();
      return this;
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
