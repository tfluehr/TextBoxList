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

  [1]: http://www.prototypejs.org/
  [2]: docs/index.html
