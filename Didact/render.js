/**
 * @typedef {Object} Fiber
 * @property {HTMLElement | Text | null} dom - 対応するDOMノード
 * @property {Object} props - プロパティ
 * @property {Fiber[]} props.children - 子要素の配列
 * @property {Fiber} [parent] - 親ファイバー
 * @property {string} [type] - 要素のタイプ（例：'div', 'span', 'TEXT_ELEMENT'）
 * @property {Fiber | undefined} [child] - 子となるファイバー
 * @property {Fiber | undefined} [sibling] - 兄弟となるファイバー
 *
 */

/**
 * 次の作業を保管
 * @type {Fiber | null}
 */
let nextUnitOfWork = null;

/**
 * レンダー関数
 * @param {Fiber} element - レンダリングする要素
 * @param {HTMLElement} container - 要素をマウントするコンテナ
 */
export const render = (element, container) => {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  };
};

/** ブラウザが準備でき次第workLoopを開始する */
window.requestIdleCallback(workLoop);

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
  // 1.domをnodeに登録
  // fiberに対応するdomが格納されていない場合、新しく生成し保管
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // fiberに対応するdomが作成できている場合、親要素に対してdomを追加
  if (fiber.dom) {
    fiber.parent.dom.append(fiber.dom);
  }

  // 2. 新しいfiberを作成
  const elements = fiber.props.children;

  elements.reduce((previousElement, currentTargetElement, index) => {
    /** @type {Fiber} */
    const newFiber = {
      type: currentTargetElement.type,
      props: currentTargetElement.props,
      parent: currentTargetElement.parent,
      dom: null,
    };

    if (index === 0) {
      fiber.child = newFiber;
    } else {
      // childrenにある最初の要素以外は兄弟要素として登録
      // 兄弟要素を数珠つなぎにしていくイメージ
      previousElement.sibling = newFiber;
    }

    // 次回previousElementとなり兄弟要素が登録される
    return newFiber;
  }, fiber);

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
