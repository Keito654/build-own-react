const createDom = (fiber) => {
  console.log(fiber);
  const dom = fiber.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type);

  const isProperty = (key) => key !== 'children';
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });

  return dom;
};

let nextUnitOfWork = null;

export const render = (element, container) => {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  };
};

const workLoop = (deadline) => {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  requestIdleCallback(workLoop);
};

requestIdleCallback(workLoop);

const performUnitOfWork = (fiber) => {
  // fiberをdomに登録する
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // fiberに親がある場合、親要素の子として登録
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom);
  }

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
