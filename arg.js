import { unwrap } from "./form_helpers.js"
import Tokenizer from "./tokenizer.js"

export default class Arg {
  constructor(str) {
    this.str = str
    this.typename = undefined
    this.optional = undefined
    this.defaultval = undefined
    this.placeholder = undefined

    this.raw = undefined
    this.options = undefined

    this.content = undefined
    this.allowedtypes = "Any"

    this.tokenizer = new Tokenizer

    this.breakdown(str)
  }

  breakdown(str) {
    // Numeric
    // Numeric?
    // Numeric(0)
    // String(abc)
    // String("abc")
    // String:sup
    // String?("Default Value"):"Bigger Placeholder"
    let match = str.match(this.argRegex())
    if (match) {
      const { typename, optional, defaultval, placeholder } = match.groups
      this.typename = typename
      this.optional = !!optional
      this.defaultval = unwrap(defaultval)
      this.placeholder = unwrap(placeholder)
    } else {
      // Strings for displaying words
      if (str.charAt(0) == "\"" || str.charAt(0) == "\'") { return this.raw = unwrap(str) }
      // content(String|Numeric)
      // content([a b c])
      // content(Keyval [a b c])
      match = str.match(/^content(?:\((?<allowedtypes>[A-Z][_0-9A-Za-z|]*)? ?(?:\[(?<args>.*)\])?\))?/)
      if (match) {
        let { allowedtypes, args } = match.groups
        this.content = true
        if (allowedtypes) { this.allowedtypes = allowedtypes }
        if (args) { this.options = this.tokenizer.split(args || "") }
        return
      }
      // [optiona b c]
      // [optiona b c]?
      match = str.match(/\[(.*)\](\?)?/)
      if (match) {
        this.optional = match[2] == "?"
        this.options = this.tokenizer.split(match[1])
      }
      return
    }
  }

  argRegex(flags) {
    return new RegExp([
      /^(?<typename>[A-Z][_0-9A-Za-z|]*)/,
      /(?<optional>\?)?/,
      /(?:\((?<defaultval>.*)\))?/,
      /(?::(?<placeholder>.*))?/,
    ].map(pattern => pattern.source).join(""), flags)
  }
}
