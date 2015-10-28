import Cycle from '@cycle/core';
import {h, makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeJSONPDriver} from '@cycle/jsonp';
import Rx from 'rx';

const {div, label, input, hr, ul, li, a, img} = require('hyperscript-helpers')(h);

function log(thing){
    console.log(thing);
    return thing;
}

function main(responses) {
  //google books api cannot retreive isbn...
  const GITHUB_SEARCH_API =
        'https://app.rakuten.co.jp/services/api/BooksTotal/Search/20130522?format=json&booksGenreId=001&applicationId=1088506385229803383&formatVersion=2&keyword='

    //https://app.rakuten.co.jp/services/api/BooksBook/Search/20130522?applicationId=1088506385229803383&booksGenreId=001004008&sort=%2BitemPrice&formatVersion=2&title=%E5%A4%AA%E9%99%BD
  // Requests for Github repositories happen when the input field changes,
  // debounced by 500ms, ignoring empty input field.
  const searchRequest$ = responses.DOM.select('.field').events('input')
    .debounce(500)
    .map(ev => ev.target.value)
    .filter(query => query.length > 1)
    .map(q => GITHUB_SEARCH_API + encodeURI(q));

  // Convert the stream of HTTP responses to virtual DOM elements.
  const books$ = responses.HTTP
    .filter(res$ => res$.request.indexOf(GITHUB_SEARCH_API) === 0)
    .switch()
        .map(res => res.body.Items)
        // .map(items => {
        //   return items.filter(item => item.isbn !== undefined)
        // }).map(log)
    .startWith([]);

    //const booksWithLib$ = books$.map(results =>
  const LIBRARY_ID = "Tokyo_Fuchu"
  const HELLO_URL = `http://api.calil.jp/check?appkey=bc3d19b6abbd0af9a59d97fe8b22660f&systemid=${LIBRARY_ID}&format=json&isbn=`
    //4834000826
  // let calilRequest$ = Cycle.Rx.Observable.just(HELLO_URL);
  const calilRequest$ = books$.filter(query => query.length > 0)
  .map(results =>
    //results[0].isbn
    results.map(result => result.isbn)
      ).map(q => HELLO_URL + encodeURI(q)).map(log);

  const booksStatus$ = responses.JSONP
    .filter(res$ => res$.request.indexOf(HELLO_URL) === 0)
        .switch().flatMap(result => {
      if(result.continue == 1){
        return [Object.assign({}, result, {continue:0}), result]
      }
      return [result]
    }).map(result => {
      if(result.continue == 1){
        throw result
      }
      return result
    })
    .retryWhen(function(errors) {
      return errors.delay(2000); //.map(log)
    }).distinctUntilChanged()
        .map(log).subscribe();

  // const booksStatusRes$ = responses.JSONP
  //       .filter(res$ => res$.request.indexOf(HELLO_URL) === 0)
  //       .mergeAll().map(log).subscribe();
  // var source = Cycle.Rx.Observable.combineLatest(
  //   source1,
  //   source2,
  //   function (s1, s2) { return s1 + ', ' + s2; }
  // )
    // .map(results => {
    //         //return results//.map(result => {return result})
    //         var keys=[];
    //         for (var key in results){
    //             // keys.push({isbn:key,
    //             //         libkey:results[key].libkey,
    //             //         reserveurl:results[key].reserveurl});
    //             console.log(results[key][LIBRARY_ID].libkey["宮町"]);
    //         };
    //         return keys;
    // })//.map(result => result)

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
            result.largeImageUrl ? img({src: result.largeImageUrl}) : null,
            label({className: 'label'}, result.title),
            label({className: 'label'}, result.isbn)
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
