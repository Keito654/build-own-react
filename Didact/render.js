const createDom = (fiber) => {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  const isProperty = (key) => key !== "children";
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });

  return dom;
};

let nextUnitOfWork = null;
let wipRoot = null;

export const render = (element, container) => {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
  };
  nextUnitOfWork = wipRoot;
};

const commitWork = (fiber) => {
  if(!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

const commitRoot = () => {
  commitWork(wipRoot.child);
  wipRoot = null;
};

const workLoop = (deadline) => {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
};

requestIdleCallback(workLoop);

const performUnitOfWork = (fiber) => {
  // fiberをdomに登録する
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // // fiberに親がある場合、親要素の子として登録
  // if (fiber.parent) {
  //   fiber.parent.dom.appendChild(fiber.dom);
  // }

  // fiberの子要素・兄弟要素を見つけ、ターゲットfiberに登録する
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    };

    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }

  // ターゲットfiberに子要素がある場合、次は子要素で実行
  if (fiber.child) {
    return fiber.child;
  }

  // 兄弟要素が登録されている場合、次は兄弟要素
  // なければ親要素の兄弟要素に移動する
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
};
