class TestFormData {
  constructor() {
    this._parts = [];
  }

  append(name, value) {
    this._parts.push([String(name), value]);
  }
}

global.FormData = global.FormData || TestFormData;
require("whatwg-fetch");
