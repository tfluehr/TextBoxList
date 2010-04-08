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
    // no idea what this is for
    options: $H({
      min: 5,
      max: 500,
      step: 7
    }),
    
    initialize: function(element, options){
      var that = this;
      this.options.update(options);
      this.el = $(element);
      this.width = this.el.offsetWidth;
      this.el.observe('keyup', function(){
        var newsize = that.options.get('step') * $F(this).length;
        if (newsize <= that.options.get('min')) {
          newsize = that.width;
        }
        if (!($F(this).length == this.retrieve('rt-value') || newsize <= that.options.min || newsize >= that.options.max)) {
          this.setStyle({
            'width': newsize
          });
        }
      }).observe('keydown', function(){
        this.store('rt-value', $F(this).length);
      });
    }
  });
  
  TextboxList = Class.create({
    initialize: function(element, options, data){
      this.options = Object.extend({
        autocomplete: {
          'opacity': 0.8,
          'maxresults': 10,
          'minchars': 1
        },
        /*
         onInputBlur: $empty,
         onBoxFocus: $empty,
         onBoxBlur: $empty*/
        resizable: {},
        className: 'bit',
        separator: '###',
        extrainputs: true,
        startinput: true,
        hideempty: true,
        fetchFile: undefined,
        results: 10,
        wordMatch: false
      }, options);
      top.console.log(1);
      
      this.element = $(element).hide();
      top.console.log(2);
      
      this.bits = new Hash();
      this.events = new Hash();
      this.count = 0;
      this.current = false;
      top.console.log(3);
      this.maininput = this.createInput({
        'class': 'maininput'
      });
      top.console.log(4);
      this.holder = new Element('ul', {
        'class': 'holder'
      }).insert(this.maininput);
      top.console.log(5);
      this.element.insert({
        'before': this.holder
      });
      top.console.log(6);
      this.holder.observe('click', (function(event){
        event.stop();
        if (this.maininput != this.current) {
          this.focus(this.maininput);
        }
      }).bind(this));
      top.console.log(7);
      this.makeResizable(this.maininput);
      top.console.log(8);
      this.setEvents();
      top.console.log(9);
      
      // facestart
      this.data = data || [];
      var autoholder = 'facebook-auto';
      top.console.log(autoholder);
      this.autoholder = $(autoholder).setOpacity(this.options.autocomplete.opacity);
      top.console.log(this.autoholder);
      this.autoholder.observe('mouseover', (function(){
        this.curOn = true;
      }).bind(this)).observe('mouseout', (function(){
        this.curOn = false;
      }).bind(this));
      this.autoresults = this.autoholder.select('ul').first();
      var children = this.autoresults.select('li');
      children.each(function(el){
        this.add({
          value: el.readAttribute('value'),
          caption: el.innerHTML
        });
      }, this);
    },
    
    setEvents: function(){
      document.observe(Prototype.Browser.IE ? 'keydown' : 'keypress', (function(e){
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
        document.fire('blur');
      }).bindAsEventListener(this));
    },
    
    update: function(){
      this.element.value = this.bits.values().join(this.options.separator);
      return this;
    },
    
    add: function(text, html){
      var id = this.options.className + '-' + this.count++;
      var el = this.createBox($pick(html, text), {
        'id': id
      });
      (this.current || this.maininput).insert({
        'before': el
      });
      el.observe('click', (function(e){
        e.stop();
        this.focus(el);
      }).bind(this));
      this.bits.set(id, text.value);
      if (this.options.extrainputs && (this.options.startinput || el.previous())) {
        this.addSmallInput(el, 'before');
      }
      return el;
    },
    
    addSmallInput: function(el, where){
      var input = this.createInput({
        'class': 'smallinput'
      });
      el.insert({}[where] = input);
      input.store('small', true);
      this.makeResizable(input);
      if (this.options.hideempty) {
        input.hide();
      }
      return input;
    },
    
    dispose: function(el){
      this.bits.unset(el.id);
      if (el.previous() && el.previous().retrieve('small')) {
        el.previous().remove();
      }
      if (this.current == el) {
        this.focus(el.next());
      }
      this.autoFeed(el.retrieve('text').evalJSON(true)); 
      
      el.remove();
      return this;
    },
    inputFocus: function(el){
      this.autoShow();
    },
    focus: function(el, nofocus){
      if (!this.current) {
        el.fire('focus');
      }
      else if (this.current == el) {
        return this;
      }
      this.blur();
      el.addClassName(this.options.className + '-' + el.retrieve('type') + '-focus');
      if (el.retrieve('small')) {
        el.setStyle({
          'display': 'block'
        });
      }
      if (el.retrieve('type') == 'input') {
        this.inputFocus(el);
        if (!nofocus) {
          this.callEvent(el.retrieve('input'), 'focus');
        }
      }
      else {
        el.fire('onBoxFocus');
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
      else {
        this.current.fire('onBoxBlur');
      }
      if (this.current.retrieve('small') && !input.get('value') && this.options.hideempty) {
        this.current.hide();
      }
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
        this.dispose(li);
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
      el.store('resizable', new ResizableTextbox(el, Object.extend(this.options.resizable, {
        min: el.offsetWidth,
        max: (this.element.getWidth() ? this.element.getWidth() : 0)
      })));
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
        return this.dispose(this.current);
      }
      if (this.checkInput() && this.bits.keys().length && this.current.previous()) {
        return this.focus(this.current.previous());
      }
    },
    autoShow: function(search){
      this.autoholder.setStyle({
        'display': 'block'
      });
      this.autoholder.descendants().each(function(e){
        e.hide();
      });
      if (!search || !search.strip() || (!search.length || search.length < this.options.autocomplete.minchars)) {
        this.autoholder.select('.default').first().setStyle({
          'display': 'block'
        });
        this.resultsshown = false;
      }
      else {
        this.resultsshown = true;
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
          if (ti >= this.options.autocomplete.maxresults) {
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
      this.add(el.retrieve('result'));
      delete this.data[this.data.indexOf(Object.toJSON(el.retrieve('result')))];
      this.autoHide();
      top.console.log(this.lastinput, ' ** ', this.current);
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
    }//,
    // no idea what this is for
    //    filter:function(D,E){var C=[];for(var B=0,A=this.length;B<A;B++){if(D.call(E,this[B],B,this)){C.push(this[B]);}}return C;}
  });
  
  var $pick = function(){
    for (var B = 0, A = arguments.length; B < A; B++) {
      if (!Object.isUndefined(arguments[B])) {
        return arguments[B];
      }
    }
    return null;
  };
})();
