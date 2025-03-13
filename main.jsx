import * as Didact from './Didact';

/** @jsx Didact.createElement */
const container = document.getElementById('root');

const App = (props) => {
  const [state, setState] = Didact.useState(1);

  return (
    <div>
      <h1>{props.name}</h1>
      <button onclick={() => setState((prev) => prev + 1)}>クリック</button>
      <TextArea value={state} />
    </div>
  );
};

const Input = () => {
  const [text, setText] = Didact.useState('初期値');

  return (
    <div>
      <input oninput={(e) => setText(e.target.value)} value={text} />
      <App name={text} />
    </div>
  );
};

const TextArea = ({ value }) => {
  return <p>{value}</p>;
};

const rerender = () => {
  const element = (
    <div>
      <Input />
    </div>
  );
  Didact.render(element, container);
};

rerender();
