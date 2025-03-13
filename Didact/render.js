/**
 * @typedef {Object} Fiber
 * @property {HTMLElement | Text | null} dom - 対応するDOMノード
 * @property {Object} props - プロパティ
 * @property {Fiber[]} props.children - 子要素の配列
 * @property {Fiber} [parent] - 親ファイバー
 * @property {string | (props: Fiber["props"]) => Fiber} [type] - 要素のタイプ（例：'div', 'span', 'TEXT_ELEMENT'）
 * @property {Fiber | undefined} [child] - 子となるファイバー
 * @property {Fiber | undefined} [sibling] - 兄弟となるファイバー
 * @property {Fiber | undefined} [alternate] - 現在コミットされているDOMのFiberツリー
 * @property {{state: any}[]} [hooks] - hooks
 * @property {"UPDATE" | "PLACEMENT" | "DELETION"} [effectTag] - レンダリング時どのような影響があったかを表すタグ
 *
 *
 */

/**
 * 次の作業を保管
 * @type {Fiber | null}
 */
let nextUnitOfWork = null;

/**
 * DOMに登録するFiberツリー構造
 * @type {Fiber | null}
 */
let wipRoot = null;

/**
 * 現在コミットされているDOMのFiberツリー
 * @type {Fiber | null}
 */
let currentRoot = null;

/**
 * 今回のコミットで削除するノード
 * @type {Fiber[] | null}
 */
let deletions = null;

/**
 * 現在作業中のFiber
 * @type {Fiber | null}
 */
let wipFiber = null;

/**
 * hookのインデックス（useStateが複数個ある場合に見分けるため利用）
 * @type {number | null}
 */
let hookIndex = null;

/**
 * レンダー関数
 * @param {Fiber} element - レンダリングする要素
 * @param {HTMLElement} container - 要素をマウントするコンテナ
 */
export const render = (element, container) => {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };
  deletions = [];

  // wipRootがFiberとなる
  nextUnitOfWork = wipRoot;
};

/** ブラウザが準備でき次第workLoopを開始する */
window.requestIdleCallback(workLoop);

/**
 * DOMを登録する
 */
function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

/**
 * fiberにあるElementをDOMノードに登録する
 * @param {Fiber} fiber - DOMノードに登録を行うfiber
 */
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  // DOMノードを持つファイバーが見つかるまでファイバーツリーを上に移動
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

/**
 * ノードを削除するときは、DOMノードを持つ子が見つかるまで探索を続行
 * @param {Fiber} fiber
 * @param {HTMLElement | Text} domParent
 */
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}

/**
 * requestIdCallbackで行われるループ作業を定義
 * @param {IdleDeadline} deadline - アイドル期間の情報
 */
function workLoop(deadline) {
  // 非同期レンダリングのための作業ループ
  // shouldYieldがfalseに初期化され、次の作業単位が存在し、かつshouldYieldがfalseである間、ループが実行される
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    // performUnitOfWork関数が呼び出され、現在の作業単位が処理される
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // 各反復で、現在のタイムスライスの残り時間が1ミリ秒未満であるかどうかをチェックし、
    // もし残り時間が1ミリ秒未満であれば、shouldYieldがtrueに設定され、ループが終了する
    shouldYield = deadline.timeRemaining() < 1;
  }

  // nextUnitOfWorkがなくなり、fiberツリーが完成したらDOMに登録する
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  // 最後に、window.requestIdleCallbackメソッドが呼び出され、次のアイドル期間に再度workLoop関数が実行されるようにスケジュールされる
  window.requestIdleCallback(workLoop);
}

/**
 * 1. domをnodeに登録
 * 2. 新しいfiberを作成
 * 3. 次の作業を返す
 * @param {Fiber} fiber - 現在のファイバー
 * @returns {Fiber | null} - 次の作業単位
 */
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // 3. 次の作業を返す
  // もし子要素があれば、子要素を次の作業として返す
  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }

    nextFiber = nextFiber.parent;
  }
}

/**
 * 関数コンポーネントのファイバーを処理する
 * @param {Fiber} fiber - 現在のファイバー
 * @returns {Fiber | null} - 次の作業単位
 */
function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

export function useState(initial) {
  const oldHook = wipFiber.alternate !== null && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => {
    if (action instanceof Function) {
      hook.state = action(hook.state);
    } else {
      hook.state = action;
    }
  });

  const setState = (action) => {
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

/**
 * 関数コンポーネントでないファイバーを処理する
 * @param {Fiber} fiber - 現在のファイバー
 * @returns {Fiber | null} - 次の作業単位
 */
function updateHostComponent(fiber) {
  // 1.domをnodeに登録
  // fiberに対応するdomが格納されていない場合、新しく生成し保管
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
}

/**
 * fiberからDOMを作成する
 * @param {Fiber} fiber - DOMを作成するファイバー
 * @returns {HTMLElement | Text} - 作成されたDOMノード
 */
function createDom(fiber) {
  const dom = fiber.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type);

  // オブジェクトの列挙可能な文字列プロパティとメソッドの名前を返します。
  Object.keys(fiber.props)
    .filter((key) => key !== 'children')
    .forEach((name) => {
      dom[name] = fiber.props[name];
    });

  return dom;
}

const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);
const isEvent = (key) => key.startsWith('on');
const isProperty = (key) => key !== 'children' && !isEvent(key);

/**
 * DOMのPropsを更新する
 * @param {HTMLElement | Text} dom
 * @param {Object} prevProps
 * @param {Object} nextProps
 */
function updateDom(dom, prevProps, nextProps) {
  // 古いPropsを削除
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = '';
    });

  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name];
    });

  // イベントリスナーは削除・登録方法が異なるため別に処理する
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

/**
 * 子要素のfiberを作成する
 * @param {Fiber} wipFiber - 対象Fiber
 * @param {Fiber[]} elements - 対象のfiberの子要素
 */
function reconcileChildren(wipFiber, elements) {
  // 古いファイバーがある場合、新しいelementと比較する処理を入れる
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;

  /** @type {Fiber | null} - 前回のループでsiblingとなったFiberの参照を保管 */
  let prevSibling = null;

  while (index < elements.length || (oldFiber !== null && oldFiber !== undefined)) {
    const element = elements[index];

    /** @type {Fiber | null} */
    let newFiber = null;

    const isSameType = oldFiber && element && element.type === oldFiber.type;

    // 同一タイプの場合、DOMを新しくつくらずpropsを更新するだけ
    if (isSameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    }

    // elementがあり、古いものと一致しない→新しいDOMを追加
    if (element && !isSameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      };
    }

    // oldFiberがあり、古いものと一致しない→古いDOMを削除
    if (oldFiber && !isSameType) {
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}
