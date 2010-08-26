[TextboxList][2]: A [Prototype.js][1] based Text Box List
========================================

Create a new instance:
----------------------

>     new TextboxList(Input, Options, [Data]);

>  - **Input** - the Text Box to convert into a TextboxList (can be the id or the DOM Element)
>  - **Options** - An object containing all options for the TextboxList
>  - **Data**[*optional*] - An Array of data to be used for the auto completer.

Auto completer data format:
---------------------------

>     [{
>       "caption": "Caption 1",
>       "value": "Value 1"
>     },
>     {
>       "caption": "Caption 2",
>       "value": "Value 2"
>     }]

>  - **caption** is the value displayed in both the auto completer and what is displayed in the bubble.
>  - **value** is a hidden value that will be linked with the **caption**.  Think name/id pairs
>  - You may also include any other additional properties and they will be posted as well.

Posted Values:
--------------

> Values for will be loaded from/posted to the server in the form of serialized JSON in the input field's value property

Options:
--------

> Data Type and Default value are shown in parenthesis. 

  - **autoCompleteActive** (Boolean = *true*) - Whether to use the auto complete functionality
    - When set to false there will be no lookup so you can use the control to simply display or manually enter values
  - **url** (String = *null*) - The url to use for auto complete. 
    - An AJAX request will be sent to this address whenever the user types more then **minchars**
  - **opacity** (Number = *0.8*) - The Opacity to use for the auto complete/message drop down 
  - **maxresults** (Integer = *Infinity*) - The Maximum number of items to display in the auto complete drop down.
    - By default the auto complete does not use a scroll bar and instead uses this property to decide how many items to display
    - If you want a scroll bar you can adjust your css styles.
  - **minchars** (Integer = *1*) - The minimum number of character for activating the auto complete dropdown 
    - Very useful for limiting the number of requests to your server when using the AJAX auto complete.
  - **noResultsMessage** (String = *"No values found"*) - Message to display when the search string is not found in the auto complete data. 
  - **hintMessage** (String = *null*) - Message to display the text box list receives focus.
    - Can be used to give the user some additional info.
  - **requestDelay** (Number = *0.3*) - The delay (in seconds) after last keypress to wait before sending an AJAX request.
    - Very useful for limiting the number of requests to your server when using the AJAX auto complete.
  - **parent** (String/Element = *document.body*) - The id or DOM Element that the auto complete/message div will be added to.
    - Depending on your page layout and/or css you may need to change this.
  - **startsWith** (Boolean = *false*) - Limit the auto complete matches to only items that start with the search value
  - **regExp** (String = *"^{0}" or "{0}" depending on **startsWith***) - The regular expression to use for matching/highlighting auto complete values.
    - Can be changed to any valid regular expression string
  - **secondaryRegExp** (String = *null*) - A Secondary regular expression to use for matching/highlighting auto complete values.
    - Can be changed to any valid regular expression string
    - Useful in combination with **regExp** if you want to match on two different items.  For example you want to search the same data set twice.  First for items that start with, and then for items that just contain.
    - The results of **secondaryRegExp** are appended to the results of **regExp**
  - **selectKeys** (Array = *[{ keyCode: Event.KEY_RETURN }, { keyCode: Event.KEY_TAB }]*) - An Array of keys to be used to select an item from the auto complete dropdown.
    - If the key is non-printable you simple add an Object to the Array with one property "keyCode" with it's value set to the ascii keyCode.
    - *Still needs to be implemented* - If the key is printable then you would add an Object to the Array with two properties "character" set to the actual character to match AND "printable" set to true.
  - **customTagKeys** (Array = *[}]*) - An Array of keys to be used to add the current text as a value (not from auto complete).
    - *Still needs to be tested* - If the key is non-printable you simple add an Object to the Array with one property "keyCode" with it's value set to the ascii keyCode.
    - If the key is printable then you would add an Object to the Array with two properties "character" set to the actual character to match AND "printable" set to true.
      - Also supports requiring two instances of "character" for a match.  One at the beginning of the string and one at the end. Example: customTagKeys = [{ character: '"', printable: true, isPair: true }, { character: ' ', printable: true }]
        - In this example if the user is typing and hits "space" then it would add the current text, unless the text started with " then it would wait for another " to be entered to add the item.
  - **disabledColor** (String = *silver*) - The color of a div that will be placed over top of the control when it is disabled.
  - **disabledOpacity** (Number= *0.3*) - The opacity of a div that will be placed over top of the control when it is disabled.


  [1]: http://www.prototypejs.org/
  [2]: index.html
