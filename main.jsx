import * as Didact from './Didact';

/** @jsx Didact.createElement */
const container = document.getElementById('root');

const App = (props) => {
  return (
    <div>
      <h1>はいどーもどついたれ本舗です</h1>
      <TextArea value={props.name} />
    </div>
  );
};

const TextArea = ({ value }) => {
  return <p>{value}</p>;
};

const updateValue = (e) => {
  rerender(e.target.value);
};

const rerender = (value) => {
  const element = (
    <div>
      <input oninput={updateValue} value={value} />
      <App name={value} />
    </div>
  );
  Didact.render(element, container);
};

rerender('World');
