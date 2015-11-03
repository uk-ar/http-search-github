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
  const filterRequest$ = responses.DOM.select('.filter').events('change')
    .map(ev => ev.target.checked)
    .startWith(false)

  // Convert the stream of HTTP responses to virtual DOM elements.
  const books$ = responses.HTTP
    .filter(res$ => res$.request.indexOf(GITHUB_SEARCH_API) === 0)
    .switch()
    .map(res => res.body.Items)
    .startWith([])

    //const booksWithLib$ = books$.map(results =>
  const LIBRARY_ID = "Tokyo_Fuchu"
  const HELLO_URL = `http://api.calil.jp/check?appkey=bc3d19b6abbd0af9a59d97fe8b22660f&systemid=${LIBRARY_ID}&format=json&isbn=`
    //4834000826
  // let calilRequest$ = Cycle.Rx.Observable.just(HELLO_URL);
  const calilRequest$ = books$.filter(query => query.length > 0)
    .map(books => books.map(book => book.isbn))
    .map(q => HELLO_URL + encodeURI(q));

  const booksStatus$ = responses.JSONP
    .filter(res$ => res$.request.indexOf(HELLO_URL) === 0)
    .switch()
    .flatMap(result => [Object.assign({}, result, {continue:0}), result])
    .map(result => {
      if(result.continue == 1){
        throw result
      }
      return result
    })
    .retryWhen(function(errors) {
      return errors.delay(2000); //.map(log)
    }).distinctUntilChanged().map(result=>result.books)
    .startWith([])
    .share()

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

  const booksWithStatus$ = books$
    .combineLatest(booksStatus$,(books,booksStatus)=>{
      return books.map(book => {
       if((booksStatus[book.isbn] !== undefined)&&
          (booksStatus[book.isbn][LIBRARY_ID].libkey !== undefined)){
         book.exist =
           Object.keys(booksStatus[book.isbn][LIBRARY_ID].libkey).length !=0;
         book.status =
           booksStatus[book.isbn][LIBRARY_ID].libkey;
         book.reserveUrl =
           booksStatus[book.isbn][LIBRARY_ID].reserveurl;
         console.log(book.exist)
       }
       return book
      })
    })
    .combineLatest(filterRequest$,(books,filter)=>{
      return filter ? books.filter(book => book.exist) : books
    })

  const vtree$ = booksWithStatus$
    .map(results =>
      div([
        label({className: 'label'}, 'Search:'),
        input({className: 'field', attributes: {type: 'text'}}),
        input({className: 'filter', attributes: {type: 'checkbox'}}),
        hr(),
        ul({className: 'search-results'}, results.map(result =>
          li({className: 'search-result'}, [
            result.largeImageUrl ? img({src: result.largeImageUrl}) : null,
            label({className: 'label'}, result.title),
            label({className: 'label'}, result.isbn),
           result.exist ?
             a({href: result.reserveUrl}, result.exist.toString()): null,
           //label({className: 'label'}, result.exist.toString()) : null,
            //result.status ? label({className: 'label'}, result.status) : null,
            //img({src: result.owner.avatar_url, style: {'width': '40px', 'height': '40px'}}),
            // a({href: result.html_url}, result.name)
          ])
        ))
      ])
    )
  //books$.connect()

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
