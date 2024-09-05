import $ from 'jquery';
import mockstore from './src/__mocks__/store'
global.$ = global.jQuery = $;
jest.mock('./src/app/store', ()=>mockstore)