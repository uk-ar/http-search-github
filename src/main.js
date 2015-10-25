import Cycle from '@cycle/core';
import {h, makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeJSONPDriver} from '@cycle/jsonp';

const {div, label, input, hr, ul, li, a, img} = require('hyperscript-helpers')(h);

function log(thing){
    console.log(thing);
    return thing;
}

function main(responses) {
  //const GITHUB_SEARCH_API = 'https://api.github.com/search/repositories?q=';
  //google books api cannot retreive isbn...
    const GITHUB_SEARCH_API = 'https://app.rakuten.co.jp/services/api/BooksBook/Search/20130522?applicationId=1088506385229803383&booksGenreId=001&sort=%2BitemPrice&formatVersion=2&title=';
    //https://app.rakuten.co.jp/services/api/BooksTotal/Search/20130522?format=json&booksGenreId=001&applicationId=1088506385229803383&keyword=%E3%81%90%E3%82%8A%E3%81%A8%E3%81%90%E3%82%89

    //https://app.rakuten.co.jp/services/api/BooksBook/Search/20130522?applicationId=1088506385229803383&booksGenreId=001004008&sort=%2BitemPrice&formatVersion=2&title=%E5%A4%AA%E9%99%BD
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
  const books$ = responses.HTTP
    .filter(res$ => res$.request.indexOf(GITHUB_SEARCH_API) === 0)
    .flatMap(x => x)
    .map(res => res.body.items)
    .startWith([]);

    //const booksWithLib$ = books$.map(results =>
  const HELLO_URL = 'http://api.calil.jp/check?appkey=bc3d19b6abbd0af9a59d97fe8b22660f&systemid=Tokyo_Fuchu&format=json&isbn='
    //4834000826
  // let calilRequest$ = Cycle.Rx.Observable.just(HELLO_URL);
  const calilRequest$ = books$.map(results =>
    results[1]
  ).map(log).map(q => HELLO_URL + encodeURI(q)).map(log);
  // const booksWithLib$ = responses.JSONP
  //   .filter(res$ => res$.request === HELLO_URL)
  //   .mergeAll().map(log).subscribe()
    //.mergeAll();//.subscribe();
  // const booksWithLib$ = books$.map(results =>
  //   results.map(result =>
  //   results.map(result =>
  //     console.log(result)
  //   )
  // ).subscribe()

  const vtree$ = books$.map(results =>
      div([
        label({className: 'label'}, 'Search:'),
        input({className: 'field', attributes: {type: 'text'}}),
        hr(),
        ul({className: 'search-results'}, results.map(result =>
          li({className: 'search-result'}, [
             result.volumeInfo.imageLinks ? img({src: result.volumeInfo.imageLinks.thumbnail}) : null,
              label({className: 'label'}, result.volumeInfo.title)
            //img({src: result.owner.avatar_url, style: {'width': '40px', 'height': '40px'}}),
            // a({href: result.html_url}, result.name)
          ])
        ))
      ])
    )

  const request$ = searchRequest$//.merge(otherRequest$);

  return {
    DOM: vtree$,
    HTTP: request$,
    JSONP: calilRequest$
  };
}

Cycle.run(main, {
  DOM: makeDOMDriver('#main-container'),
  HTTP: makeHTTPDriver(),
  JSONP: makeJSONPDriver()
});
