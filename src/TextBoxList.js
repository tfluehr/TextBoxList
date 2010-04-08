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
      }).bind(this)).observe('keydown', (function(ev){
        this.el.store('rt-value', $F(this.el).length);
      }).bind(this));
    }
  });
  
  TextboxList = Class.create({
    initialize: function(element, options, data){
      this.options = Object.deepExtend({
        autoComplete: {
          'opacity': 0.8, // opacity of drop down
          'maxresults': 10, // max results to display in drop down
          'minchars': 1, // min characters to show dropdown
          message: '&nbsp;', // message to be displayed 
          showMessage: false // whether to show the message on focus
        },
        className: 'bit',
        hideempty: true,
        fetchFile: undefined,
        results: 10,
        wordMatch: false
      }, options);
      
      this.input = $(element).hide();
      
      this.bits = new Hash();
      this.events = new Hash();
      this.count = 0;
      this.current = false;
      this.setupMainElements();
      this.makeResizable(this.maininput);
      this.setEvents();
      this.setupAutoComplete();
      this.data = data || [];
      this.data.each(function(item){
        
      }, this);
    },
    setupMainElements: function(){
      this.container = new Element('div', { // container to hold all controls
        'class': 'TextboxList'
      });
      this.maininput = this.createInput({ // input to type into
        'class': 'maininput'
      });
      this.holder = new Element('ul', { // hold the input and all selected items
        'class': 'holder'
      }).insert(this.maininput);
      this.input.insert({
        'before': this.container
      });
      this.container.insert(this.holder);
      this.container.insert(this.input);
      
      this.holder.observe('click', (function(event){
        //event.stop(); not sure why it was being stopped
        if (this.maininput != this.current) {
          this.focus(this.maininput);
        }
      }).bind(this));
    },
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
      this.autoholder.observe('mouseover', (function(){
        this.curOn = true;
      }).bind(this)).observe('mouseout', (function(){
        this.curOn = false;
      }).bind(this));
    },
    setEvents: function(){
      document.observe('keydown', (function(e){
        if (!this.current) {
          return;
        }
        if (this.current.retrieve('type') == 'box' && e.keyCode == Event.KEY_BACKSPACE) {
          e.stop();
        }
      }).bind(this));
      
      document.observe('keyup', (function(e){
        e.stop();
        if (!this.current) {
          return;
        }
        switch (e.keyCode) {
          case Event.KEY_LEFT:
            return this.move('left');
          case Event.KEY_RIGHT:
            return this.move('right');
          case Event.KEY_DELETE:
          case Event.KEY_BACKSPACE:
            return this.moveDispose();
        }
      }).bind(this)).observe('click', (function(){
            //        document.fire('blur');
      }).bindAsEventListener(this));
    },
    
    addItem: function(val){
      var id = this.options.className + '-' + this.count++;
      var el = this.createBox(val, {
        'id': id
      });
      (this.current || this.maininput).insert({
        'before': el
      });
      el.observe('click', (function(e){
        e.stop();
        this.focus(el);
      }).bind(this));
      this.bits.set(id, val);
      this.updateInputValue();
      return el;
    },
    updateInputValue: function(){
      this.input.setValue(Object.toJSON(this.bits.values()));
    },
    removeItem: function(el){
      this.bits.unset(el.id);
//      if (el.previous() && el.previous().retrieve('small')) {
//        el.previous().remove();
//      }
      if (this.current == el) {
        this.focus(el.next());
      }
      this.autoFeed(el.retrieve('text').evalJSON(true));
      
      el.stopObserving().remove();
      this.updateInputValue();
      return this;
    },
    inputFocus: function(el){
      this.autoShow();
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
//      if (el.retrieve('small')) {
//        el.setStyle({
//          'display': 'block'
//        });
//      }
      if (el.retrieve('type') == 'input') {
        this.inputFocus(el);
        if (!nofocus) {
          this.callEvent(el.retrieve('input'), 'focus');
        }
      }
      else {
            //        el.fire('onBoxFocus');
      }
      this.current = el;
      return this;
    },
    
    blur: function(noblur){
      if (!this.current) {
        return this;
      }
      if (this.current.retrieve('type') == 'input') {
        var input = this.current.retrieve('input');
        if (!noblur) {
          this.callEvent(input, 'blur');
        }
        this.inputBlur(input);
      }
      //      else {
      //        this.current.fire('onBoxBlur');
      //      }
//      if (this.current.retrieve('small') && !input.get('value') && this.options.hideempty) {
//        this.current.hide();
//      }
      this.current.removeClassName(this.options.className + '-' + this.current.retrieve('type') + '-focus');
      this.current = false;
      return this;
    },
    inputBlur: function(el){
      this.lastinput = el;
      if (!this.curOn) {
        this.blurhide = this.autoHide.bind(this).delay(0.1);
      }
    },
    createBoxLI: function(text, options){
      return new Element('li', options).addClassName(this.options.className + '-box').update(text.caption).store('type', 'box');
    },
    
    createBox: function(text, options){
      var li = this.createBoxLI(text, options);
      li.observe('mouseover', function(){
        this.addClassName('bit-hover');
      }).observe('mouseout', function(){
        this.removeClassName('bit-hover');
      });
      var a = new Element('a', {
        'href': '#',
        'class': 'closebutton'
      });
      a.observe('click', (function(e){
        e.stop();
        if (!this.current) {
          this.focus(this.maininput);
        }
        this.removeItem(li);
      }).bind(this));
      li.insert(a).store('text', Object.toJSON(text));
      return li;
    },
    
    createInput: function(options){
      var li = this.createInputLI(options);
      var input = li.retrieve('input');
      input.observe('keydown', (function(e){
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
            if (this.current && this.current.retrieve('input')) {
              this.current.retrieve('input').clear();
            }
            break;
          default:
            this.dosearch = true;
        }
      }).bind(this));
      input.observe('keyup', (function(e){
      
        switch (e.keyCode) {
          case Event.KEY_UP:
          case Event.KEY_DOWN:
          case Event.KEY_RETURN:
          case Event.KEY_ESC:
            break;
          default:
            if (!Object.isUndefined(this.options.fetchFile)) {
              new Ajax.Request(this.options.fetchFile, {
                method: 'get',
                parameters: {
                  keyword: input.value
                },
                method: 'get',
                onSuccess: (function(transport){
                  transport.responseText.evalJSON(true).each((function(t){
                    this.autoFeed(t);
                  }).bind(this));
                  this.autoShow(input.value);
                }).bind(this)
              });
            }
            else if (this.dosearch) {
              this.autoShow(input.value);
            }
        }
      }).bind(this));
      input.observe(Prototype.Browser.IE ? 'keydown' : 'keypress', (function(e){
        if (this.autoenter) {
          e.stop();
        }
        this.autoenter = false;
      }).bind(this));
      return li;
    },
    
    createInputLI: function(options){
      var li = new Element('li', {
        'class': this.options.className + '-input'
      });
      var el = new Element('input', Object.extend(options, {
        'type': 'text'
      }));
      el.observe('click', function(e){
        e.stop();
      }).observe('focus', (function(e){
        if (!this.isSelfEvent('focus')) {
          this.focus(li, true);
        }
      }).bind(this)).observe('blur', (function(){
        if (!this.isSelfEvent('blur')) {
          this.blur(true);
        }
      }).bind(this)).observe('keydown', function(e){
        this.store('lastvalue', this.value).store('lastcaret', this.getCaretPosition());
      });
      var tmp = li.store('type', 'input').store('input', el).insert(el);
      return tmp;
    },
    
    callEvent: function(el, type){
      this.events.set(type, el);
      el[type]();
    },
    
    isSelfEvent: function(type){
      return (this.events.get(type)) ? !!this.events.unset(type) : false;
    },
    
    makeResizable: function(li){
      var el = li.retrieve('input');
      el.store('resizable', new ResizableTextbox(el, {
        min: el.offsetWidth,
        max: (this.input.getWidth() ? this.input.getWidth() : 0)
      }));
      return this;
    },
    
    checkInput: function(){
      var input = this.current.retrieve('input');
      return (!input.retrieve('lastvalue') || (input.getCaretPosition() === 0 && input.retrieve('lastcaret') === 0));
    },
    
    move: function(direction){
      var el = this.current[(direction == 'left' ? 'previous' : 'next')]();
      if (el && (!this.current.retrieve('input') || ((this.checkInput() || direction == 'right')))) {
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
        this.data.filter(function(str){
          return str ? regexp.test(str.evalJSON(true).caption) : false;
        }).each(function(result, ti){
          count++;
          if (ti >= this.options.autoComplete.maxresults) {
            return;
          }
          var that = this;
          var el = new Element('li');
          el.observe('click', function(e){
            e.stop();
            that.autoAdd(this);
          }).observe('mouseover', function(){
            that.autoFocus(this);
          }).update(this.autoHighlight(result.evalJSON(true).caption, search));
          this.autoresults.insert(el);
          el.store('result', result.evalJSON(true));
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
      return this;
    },
    
    autoMove: function(direction){
      if (!this.resultsshown) {
        return;
      }
      this.autoFocus(this.autocurrent[(direction == 'up' ? 'previous' : 'next')]());
      this.autoresults.scrollTop = this.autocurrent.positionedOffset()[1] - this.autocurrent.getHeight();
      return this;
    },
    
    autoFeed: function(text){
      if (this.data.indexOf(Object.toJSON(text)) == -1) {
        this.data.push(Object.toJSON(text));
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
      var input = this.lastinput || this.current.retrieve('input');
      input.clear().focus();
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