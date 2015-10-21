import Cycle from '@cycle/core';
import {h, makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
const {div, label, input, hr, ul, li, a, img} = require('hyperscript-helpers')(h);

function main(responses) {
  //const GITHUB_SEARCH_API = 'https://api.github.com/search/repositories?q=';
  const GITHUB_SEARCH_API = 'https://www.googleapis.com/books/v1/volumes?q=';
  // Requests for Github repositories happen when the input field changes,
  // debounced by 500ms, ignoring empty input field.
  const searchRequest$ = responses.DOM.select('.field').events('input')
    .debounce(500)
    .map(ev => ev.target.value)
    .filter(query => query.length > 0)
    .map(q => GITHUB_SEARCH_API + encodeURI(q));

  // Requests unrelated to the Github search. This is to demonstrate
  // how filtering for the correct HTTP responses is necessary.
  const otherRequest$ = Cycle.Rx.Observable.interval(1000).take(2)
    .map(() => 'http://www.google.com');

  // Convert the stream of HTTP responses to virtual DOM elements.
  const vtree$ = responses.HTTP
    .filter(res$ => res$.request.indexOf(GITHUB_SEARCH_API) === 0)
    .flatMap(x => x)
    .map(res => res.body.items)
    .startWith([])
    .map(results =>
      div([
        label({className: 'label'}, 'Search:'),
        input({className: 'field', attributes: {type: 'text'}}),
        hr(),
        ul({className: 'search-results'}, results.map(result =>
          li({className: 'search-result'}, [
              (() =>
               //console.log(result)
               hr())(),
           //img({src: result.volumeInfo.imageLinks.smallThumbnail}),
            label({className: 'label'}, result.volumeInfo.title)
            //img({src: result.owner.avatar_url, style: {'width': '40px', 'height': '40px'}}),
            // a({href: result.html_url}, result.name)
          ])
        ))
      ])
    );

  const request$ = searchRequest$.merge(otherRequest$);

  return {
    DOM: vtree$,
    HTTP: request$
  };
}

Cycle.run(main, {
  DOM: makeDOMDriver('#main-container'),
  HTTP: makeHTTPDriver()
});
