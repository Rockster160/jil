import sortable from "./sortable.js"
import { field, element, select } from "./form_helpers.js"
import Tokenizer from "./tokenizer.js"
import Arg from "./arg.js"

export default class Method {
  constructor(data) {
    this.type = data.type
    this.name = data.name
    this.stringArgs = data.args
    this.returntype = data.returntype
    this.tokenizer = new Tokenizer

    this.default = null
    this.placeholder = null
    this.optional = false
  }

  trigger(token) { return this.tokenizer.trigger(token) }
  tokenize(str, regex, callback) { return this.tokenizer.tokenize(str, regex, callback) }
  untokenize(str) { return this.tokenizer.untokenize(str) }

  args() {
    let str = this.stringArgs
    if (!str) { return [] }
    str = this.tokenize(str, /\"(.*?)\"/)
    str = this.tokenize(str, /content\(([A-Z][_0-9A-Za-z|]*)? ?\[(.*?)\]\)/)
    str = this.tokenize(str, /\[(.*?)\]/)
    return str.split(" ").map(argStr => {
      return new Arg(this.untokenize(argStr))
    })
  }

  parsedArgs() {
    return this.args().map(arg => field(arg))
  }
}
