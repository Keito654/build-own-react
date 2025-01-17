import * as Didact from './Didact';

/** @jsx Didact.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
    <p>第二のテキストノード</p>
    <div>
      aaa
      <span>fdsfsdfsd</span>
    </div>
  </div>
);
const container = document.getElementById('root');
Didact.render(element, container);
