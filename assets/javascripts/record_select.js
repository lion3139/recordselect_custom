jQuery(window).bind("load", function() { RecordSelect.document_loaded = true });

jQuery.fn.afterActivity = function(callback, delay, _this) {
  var element = jQuery(this);
  if (!delay) delay = 0.35;

    var elem;
    jQuery(this).bind(("keyup"), function(event) {

    // TODO 用中文输入法输英文时（输入asdf，回车），有问题
    var keyCode = event.keyCode;

    switch( event.keyCode ) {
    case 0://Event.KEY_SPACE:
    case 13://keyCode.ENTER
      _this.clearActivityTimer();
      _this.abortRequestXhr("ajaxGetSearh");
      _this.abortRequestXhr("ajaxGetOpen");
    case 16://keyCode.SHIFT:
    case 17://keyCode.CTRL:
    case 18://keyCode.ALT:
    case 20://keyCode.CAPSLOCK:
    case 27://Event.KEY_ESC:
    case 33://keyCode.PAGEUP:
    case 34://keyCode.PAGEDOWN:
    case 35://keyCode.END:
    case 36://keyCode.HOME:
    case 37://Event.KEY_LEFT:
    case 38://keyCode.UP:
    case 39://Event.KEY_RIGHT:
    case 40://keyCode.DOWN:
      return;
    }

    if(event.isDefaultPrevented()) return;

    _this.clearActivityTimer();
    _this.abortRequestXhr("ajaxGetSearh");
    _this.abortRequestXhr("ajaxGetOpen");
    _this.activity_timer = setTimeout(function() {
      if(!_this.is_open()) _this.open();
      form = element.nextAll('div.record-select-container').find('form');
      callback = function(){form[0] && form[0].onsubmit(_this)};
      // TODO is close auto open
      callback(element.value);
    }, delay * 1000 + 50);
  });
  jQuery(this).bind(("keydown"), function(event) {

    var keyCode = event.keyCode;

    // hot keys
    if(event.shiftKey && event.altKey && keyCode == 78){
      _this.clearActivityTimer();
      _this.abortRequestXhr("ajaxGetSearh");
      _this.abortRequestXhr("ajaxGetOpen");
      _this.close();
      return;
    }
    switch( event.keyCode ) {
    case 38://keyCode.UP:
      elem = _this.has_current() && _this.current.parent('.record-select') && _this.current.prev(":not(.found)");
      if (elem && elem.length == 0) elem = _this.container.find("ol li:not(.found):last");
      _this.highlight(elem);
      event.preventDefault();
      return;
    case 40://keyCode.DOWN:
      if(!_this.is_open()) _this.open();
      if (_this.has_current() && _this.current.parent('.record-select')) elem = _this.current.next(":not(.found)");
      if (elem && elem.length == 0) elem = _this.container.find("ol li:not(.found):first");
      // prevent moving cursor to end of text field in some browsers
      _this.highlight(elem);
      event.preventDefault();
      return;
    case 0://Event.KEY_SPACE:
    case 13://keyCode.ENTER:
      if (_this.has_current()){
        elem = _this.current.find('a')[0];
        switch(elem){
          case _this.getPrevPageBtn()[0]: _this.doPrevPage(); break;
          case _this.getNextPageBtn()[0]: _this.doNextPage(); break;
          default : elem.onclick();
        }
      }
      event.preventDefault();
      return;
    case 39://Event.KEY_RIGHT:
      if(_this.is_open()){
        _this.doNextPage();
        event.preventDefault();
      }
      return;
    case 37://Event.KEY_LEFT:
      if(_this.is_open()){
        _this.doPrevPage();
        event.preventDefault();
      }
      return;
    case 9://keyCode.TAB:
    case 27://Event.KEY_ESC:
      _this.close();
      return;
    case 16://keyCode.SHIFT:
    case 17://keyCode.CTRL:
    case 18://keyCode.ALT:
    case 20://keyCode.CAPSLOCK:
    case 33://keyCode.PAGEUP:
    case 34://keyCode.PAGEDOWN:
    case 35://keyCode.END:
    case 36://keyCode.HOME:
      return;
    }
  });
}

var RecordSelect = new Object();
RecordSelect.document_loaded = false;

$.fn.recordSelect_notify = function() {
  var item = $(this);
  var e = item.parents(".record-select-handler");
  var my_onselect = e.my_onselect || e.attr('my_onselect') || e.prop('my_onselect');
  if (typeof my_onselect != 'function') my_onselect = eval(my_onselect);
  if (my_onselect) {
    try {
      par = item.parent();
      my_onselect(par.attr("id").substring(2), item.find('label').text() || item.text(), e);
    } catch(e) {
      alert(e);
    }
    return false;
  }
  else return true;
  return false;
}

jQuery.fn.recordSelectSingle = function(url, options) {
  var obj = $(this);
  var _this = {};
  if(!options.openEvents) options.openEvents = "focus click";

  var initialize = function(obj, url, options) {
    _this.obj = obj;
    _this.url = url;
    _this.options = options;
    _this.js_params = _this.options && _this.options.js_params;
    _this.container;

    if (RecordSelect.document_loaded) {
     _this.my_onload();
    } else {
      jQuery(window).bind('load', _this.my_onload);
    }

    jQuery(document.body).bind('mousedown', _this.onbodyclick);
  };

  _this.my_onload = function() {
    // initialize the container
    _this.container = _this.create_container();
    _this.container.addClass('record-select-autocomplete');

    // create the hidden input
    _this.obj.after('<input type="hidden" name="" value="" class="value"/>');
    _this.hidden_input = _this.obj.next("input.value:last");

    // transfer the input name from the text input to the hidden input
    _this.hidden_input.attr("name", _this.obj.attr("name"));
    _this.obj.attr("name", '');

    // initialize the values
    _this.set(_this.options.id, _this.options.label);
    _this._respond_to_text_field(_this.obj);
    if (_this.obj.focused) _this.open(); // if it was focused before we could attach observers
  };

  _this.close = function() {
    _this.clearActivityTimer();
    _this.abortRequestXhr("ajaxGetSearh");
    _this.abortRequestXhr("ajaxGetOpen");
    // if they close the dialog with the text field empty, then delete the id value
    if (_this.obj.attr("value") == '') _this.set('', '');

    if (_this._use_iframe_mask()) { _this.container.next('iframe').remove(); }

    _this.container.hide();
    // hopefully by using remove() instead of innerHTML we won't leak memory
    _this.container.children().remove();
  };

  _this.my_onselect = function(id, value, e) {
    if (_this.options.onchange) _this.options.onchange(_this.obj, id, value);
    _this.set(id, value);
    _this.obj.focus();
    _this.close();
  };

  _this.open = function(ev) {
    var elem;
    if (_this.is_open()) return;
    if (_this.ajaxGetOpen) return;
    var _params = {search: _this.obj.val()};
    if (_this.js_params) _params = $.extend(_params, _this.js_params());

    _this.ajaxGetOpen = jQuery.get(_this.url, _params, function(data, b) {
      _this.ajaxGetOpen = null;
      _this.container.html(data);
      _this.show();
      _this.highlightFirst();
      // needs to be mousedown so the event doesn't get canceled by other code (see issue #26)
    });
  };

  _this.highlightFirst = function() {
    var elem = _this.container.find('ol li.record:first');
    // prevent moving cursor to end of text field in some browsers
    _this.highlight(elem);
  };

  _this.abortRequestXhr = function(reqXhrName) {
    if (_this[reqXhrName]) {
      _this[reqXhrName].abort();
      _this[reqXhrName] = null;
    }
  };

  _this.clearActivityTimer = function() {
    if (_this.activity_timer) clearTimeout(_this.activity_timer);
  };

  _this.show = function() {
    var offset = _this.obj.position();
    _this.container.css("left", offset.left + 'px');
    _this.container.css("top", (_this.obj.outerHeight() + offset.top) + 'px');

    if (_this._use_iframe_mask()) {
      _this.container.append('<iframe src="javascript:false;" class="record-select-mask" />');
      var mask = _this.container.next('iframe');
      mask.css("left", _this.container.position().left);
      mask.css("top", _this.container.position().top);
    }

    _this.container.show();
    if (_this._use_iframe_mask()) {
      var dimensions = _this.container.children();
      mask.css("width", dimensions.outerWidth() + 'px');
      mask.css("height", dimensions.outerHeight() + 'px');
    }
  };

  _this.is_open = function() { return (!!_this.container.html()); };

  _this.set = function(id, label) {
    var text = jQuery("<div>" + label + "</div>").text();
    _this.obj.val(text);
    _this.hidden_input.val(_this.options.ass_value ? id : text);
  };

  _this.create_container = function() {
    box = obj.parent();
    box.append('<div class="record-select-container record-select-handler"></div>');
    e = box.children()[box.children().length - 1];
    e.my_onselect = _this.my_onselect;
    e = jQuery(e);
    e.hide();

    return jQuery(e);
  };

  _this.onbodyclick = function(ev) {
    var elem = jQuery(ev.target);
    if (elem.parents("li.pagination.previous").children("a")[0] == _this.getPrevPageBtn()[0]) _this.doPrevPage();
    if (elem.parents("li.pagination.next").children("a")[0] == _this.getNextPageBtn()[0]) _this.doNextPage();
    if (elem.parents("div.record-select-container").length > 0 || elem[0] == _this.obj[0]) return;
    _this.clearActivityTimer();
    _this.abortRequestXhr("ajaxGetSearh");
    _this.abortRequestXhr("ajaxGetOpen");
    _this.close();
  };

  _this._respond_to_text_field = function(text_field) {
    // attach the events to start _this party
    text_field.bind(options.openEvents, _this.open);

    // the autosearch event - needs to happen slightly late (keyup is later than keypress)
    text_field.bind('keyup', function() {
      if (!_this.is_open()) return;
      _this.container.find('.text-input').attr("value", text_field.attr("value"));
    });

    // keyboard navigation, if available
    if (_this.onkeypress) { text_field.bind((jQuery.browser.opera? "keypress" : "keydown"), _this.onkeypress); }
  };
  _this.current = null;

  _this.onkeypress = function(event) { };

  _this.highlight = function(obj) {
    if (_this.has_current()) _this.current.removeClass('current');
    if (!obj) return;
    _this.current = jQuery(obj);
    obj.addClass('current');
  };

  _this.getPrevPageBtn = function() { return _this.container.find("li.pagination.previous a"); };
  _this.getNextPageBtn = function() { return _this.container.find("li.pagination.next a"); };

  _this.doPrevPage = function(){ if(_this.getPrevPageBtn().length > 0) _this.doPage(_this.getPrevPageBtn().attr("href")); }
  _this.doNextPage = function(){ if(_this.getNextPageBtn().length > 0) _this.doPage(_this.getNextPageBtn().attr("href")); }

  _this.doPage = function(url) {
    jQuery.ajax({
      url: url,
      data: _this.js_params && _this.js_params(),
      success: function(data) {
        eval(data);
        _this.highlightFirst();
      }
    });
  };

  _this._use_iframe_mask = function() { return false; };
  _this.has_current = function() { return _this.current && _this.current.length > 0; };

  obj.afterActivity(null, 0.35, _this);
  initialize(obj, url, options);
};
