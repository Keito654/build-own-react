let obj = null;
obj = {};
const addObj = { a: 1, b: 2 };
obj.sub = addObj;

obj = addObj;
console.log(obj);
