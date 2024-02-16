import { genHex } from "./form_helpers.js"

export default class Tokenizer {
  constructor() {
    this.hold = {}
  }

  static split(str) {
    let tokenizer = new Tokenizer
    return tokenizer.split(str)
  }

  genId() {
    return "xx-xx-xx".replaceAll(/xx/g, () => genHex())
  }

  split(str) {
    let tokenized = this.tokenize(str, /\"([^"]*)\"/) // , (_m, g) => g[1]
    tokenized = this.tokenize(tokenized, /\'([^']*)\'/) // , (_m, g) => g[1]
    return tokenized.split(" ").map(token => this.untokenize(token))
  }

  trigger(token) {
    return this.hold[token]?.()
  }

  tokenize(str, regex, callback) {
    return str.replaceAll(new RegExp(regex, "g"), m => {
      let id = this.genId()
      this.hold[id] = (callback && typeof callback === "function") ? () => callback(m, m.match(regex)) : m
      return id
    })
  }

  untokenize(str) {
    return str.replaceAll(/[a-f0-9]{2}-[a-f0-9]{2}-[a-f0-9]{2}/g, m => {
      let fn = this.hold[m]
      return (fn && typeof fn === "function") ? fn() : this.untokenize(fn)
    })
  }
}
