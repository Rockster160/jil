import { fa, faStack } from "./icon.js"
import { genHex, genLetter } from "./form_helpers.js"
import Dropdown from "./dropdown.js"
import Tokenizer from "./tokenizer.js"

export default class Statement {
  static all = []
  static wrapper = document.querySelector(".statements")
  constructor(data) {
    this.id = data.id || (genLetter() + genHex(2))

    this.validateName(data?.name)
    this.addToPage()

    this.name = "" // Triggers name callback - setting "no name" class
    if (data) {
      for (const [key, value] of Object.entries(data)) { this[key] = value }
    }

    Statement.all.push(this)
  }
  static find(id) {
    return this.all.find(statement => statement.id == id)
  }
  static from(element) {
    return Statement.find(element.closest(".statement-wrapper")?.id)
  }
  static nameTaken(name, ignore) {
    if (!name) { return false }

    return Statement.all.some(statement => {
      if (ignore && statement.id == ignore.id) { return false }
      return statement._name == name
    })
  }
  static regex() {
    // wb74e = Global.test("Default Value", 2)::Any
    // p6ec7 = p4b96.split(", ")::Array
    // e739e = Boolean.new(true)::Boolean
    // d022b = Boolean.or(e739e, e739e)::Boolean
    // uef07 = Hash.new({
    //   id7e8 = Keyval.new("asd", "a")::Keyval
    //   l6c23 = Keyval.new("dsa", "b")::Keyval
    //   y1800 = Keyval.new("foo", "c")::Keyval
    // })::Hash
    // lc174 = Array.new({
    //   ha34e = String.new("Hello, world")::String
    //   m7923 = Numeric.new("75")::Numeric
    // })::Array
    let captVarName = /(?:(?<varname>[_a-z][_0-9A-Za-z]*) *= *)? */
    let captObjName = /(?<objname>[_a-zA-Z][_0-9A-Za-z]*)/
    let captMethodName = /\.(?<methodname>[_0-9A-Za-z]+)/
    let captArgs = /\((?<args>.*?)\)/
    let captCast = /::(?<cast>[A-Z][_0-9A-Za-z]*)/
    let fullRegex = new RegExp([
      captVarName,
      captObjName,
      captMethodName,
      captArgs,
      captCast,
    ].map(pattern => pattern.source).join(""), "g")

    return fullRegex
  }
  static fromText(text) {
    [...text.matchAll(/^ *(?<varname>[_a-z][_0-9A-Za-z]*) *=/gm)].forEach(m => {
      let { varname } = m.groups
      if (Statement.all.find(s => s.name == varname)) {
        text = text.replaceAll(varname, (genLetter() + genHex(2)))
      }
    })

    let adds = []
    let matches = [...text.matchAll(Statement.regex())]
    matches.forEach(match => {
      const { varname, objname, methodname, args, cast } = match.groups

      let statement = new Statement({
        name: varname,
        returntype: cast,
      })
      if (/^[A-Z]/.test(objname)) {
        statement.type = objname
      } else {
        statement.reference = objname
      }
      statement.method = methodname
      statement.argString = args

      adds.push(statement)
    })

    return adds
  }
  static available(btn, statement) {
    statement = (statement || btn)?.closest(".statement-wrapper")
    let wrapper = statement?.closest(".content, .statements")
    if (!wrapper) { return [] }

    let types = btn.getAttribute("inputtype")?.split("|") || ["Any"]

    let found = []
    let previous = statement.previousElementSibling
    while (previous) {
      if (previous.classList.contains("statement-wrapper")) {
        let prevStatement = Statement.from(previous)
        if (prevStatement) {
          if (types.indexOf("Any") >= 0 || types.indexOf(prevStatement.returntype) >= 0) {
            found.push(prevStatement)
          }
        }
      }
      previous = previous.previousElementSibling
    }

    return [...found, ...this.available(btn, wrapper.parentElement)]
  }

  static clearSelected() {
    window.selected = undefined
    document.querySelectorAll(".statement-wrapper").forEach(item => {
      item.classList.remove("upper-selected")
      item.classList.remove("selected")
      item.classList.remove("lower-selected")
    })
  }

  get wrapper() { return this.node.parentElement }

  flash() {
    this.node.classList.remove("flash")
    this.node.classList.remove("fade-out")
    clearTimeout(this.flashTimer)

    this.node.classList.add("flash")
    setTimeout(() => this.node.classList.add("fade-out"), 50)
    this.flashTimer = setTimeout(() => {
      this.node.classList.remove("flash")
      this.node.classList.remove("fade-out")
    }, 300)
  }

  addToPage() {
    const template = document.getElementById("statement")
    const statementsContainer = document.querySelector(".statements")

    let clone = template.content.cloneNode(true)
    statementsContainer.appendChild(clone)

    this.node = document.getElementById("new-statement")
    this.node.id = this.id
  }

  duplicate() {
    Statement.fromText(this.toString())

    // let other = new Statement({
    //   reference: this.reference,
    //   returntype: this.returntype,
    //   type: this.type,
    //   method: this.method,
    // })
    // // TODO: This loses `select` values
    // // This also will not clone event listeners for `content`
    // // Should probably find a better way...
    // // Likely just export to string, change the var name, and then re-append the value
    // let clone = this.node.querySelector(".obj-args").cloneNode(true)
    // other.node.querySelector(".obj-args").replaceWith(clone)
    // other.moveAfter(this)
  }

  downReferences() {
    return Statement.all.map(statement => statement.refId == this.node.id ? statement : null).filter(Boolean)
  }
  updateReferences() {
    this.downReferences().forEach(statement => statement.reference = this)
  }

  get selected() { return this.node.classList.contains("selected") }
  set selected(bool) {
    Statement.clearSelected()
    if (bool) { window.selected = this }
    this.node.classList.toggle("selected", bool)
    this.reference?.node.classList.toggle("upper-selected", bool)
    this.downReferences().forEach(item => item.node.classList.toggle("lower-selected", bool))
  }

  get reference() { return this._reference }
  set reference(ref) {
    let foundRef
    if (typeof ref === "string") {
      foundRef = Statement.find(ref)
      if (foundRef) { ref = foundRef }
    } else { // Is a Statement
      foundRef = ref
    }
    if (ref && !foundRef) {
      this._reference = null
      this.refId = ref
      this.refname = "?"
      this.addError(`Reference ${ref} not found.`)
    } else if (foundRef) {
      this._reference = foundRef
      this.refId = foundRef.id
      this.type = foundRef.returntype
      this.refname = foundRef._name || "obj"
    } else {
      this._reference = null
      this.refId = null
      this.refname = null
    }
    this.node.querySelector(".obj-refname").classList.toggle("hidden", !this.refId)
    this.node.querySelector(".obj-type").classList.toggle("hidden", !!this.refId)
    this.validate()
  }
  validate() {
    // Each arg that points to a token should verify the token exists AND returns the correct filetype
    // Make sure reference is defined in the current context
    // Make sure reference is defined before `this`
    // Make sure `type` is imported/defined
    // Make sure `method` is defined on `type` as respective class/instance level
    // Make sure each arg is valid
  }
  addError(msg) {
    this.error = true
    if (this.node) { this.node.classList.add("error") }
    (this.errors = this.errors || []).push(msg)
    // Should expose errors with a (!) That can be hovered
  }

  validateName(newname) {
    if (!newname) {
      // Empty name is allowed
    } else if (!newname.match(/^[_a-z0-9]+$/i)) {
      throw new Error("Name must match [_a-z0-9]")
    } else if (!newname.match(/^[_a-z]/)) {
      throw new Error("Name must begin with a lowercase letter!")
    } else if (Statement.nameTaken(newname, this)) {
      throw new Error("Name has already been taken!")
    }
  }

  get name() { return this.node.querySelector(".obj-varname").innerText  }
  set name(newname) {
    if (!newname) { newname = "" }
    this.validateName(newname)

    this._name = newname || this.id
    let nameNode = this.node?.querySelector(".obj-varname")
    if (nameNode) { nameNode.innerText = this._name }

    if (nameNode) {
      nameNode.classList.remove("noname")
      this.node.querySelector(".obj-eq").classList.remove("hidden")
      // if (newname.length > 0) {
      // } else {
      //   nameNode.classList.add("noname")
      //   this.node.querySelector(".obj-eq").classList.add("hidden")
      // }
    }

    this.updateReferences()
  }
  get returntype() { return this.node.querySelector(".obj-returntype").innerText }
  set returntype(new_type) {
    this._returntype = new_type
    this.node.querySelector(".obj-returntype").innerText = new_type == "Global" ? "Any" : new_type

    this.updateReferences()
  }
  get refname() { return this.node.querySelector(".obj-refname").innerText }
  set refname(new_ref) {
    this.node.querySelector(".obj-refname").innerText = new_ref
  }
  get type() { return this._type || this.node.querySelector(".obj-type").innerText }
  set type(new_type) {
    this._type = new_type
    this.node.querySelector(".obj-type").innerText = new_type
    this.node.querySelector(".obj-type").classList.toggle("hidden", new_type == "Global" || !!this.refId)
    this.node.querySelector(".obj-dot").classList.toggle("hidden", new_type == "Global")
  }
  get method() { return this.node.querySelector(".obj-method").innerText }
  set method(new_method) {
    this.node.querySelector(".obj-method").innerText = new_method
    let argsContainer = this.node.querySelector(".obj-args")
    argsContainer.innerHTML = ""

    let methodObj = Schema.method(this.reference || this.type, new_method)
    if (methodObj) {
      methodObj.parsedArgs().forEach(item => argsContainer.appendChild(item))
    } else {
      this.addError(`Failed to call ${new_method} on ${this.reference || this.type}`)
    }
  }

  get idx() { return Array.prototype.indexOf.call(this.wrapper.children, this.node) }
  moveTo(idx) {
    if (idx == this.idx) { return }

    let siblings = this.wrapper.querySelectorAll(":scope > .statement-wrapper")
    let otherNode = siblings[idx]
    let other = Statement.from(otherNode)
    if (idx < this.idx) {
      this.moveBefore(other)
    } else {
      this.moveAfter(other)
    }
  }
  moveInside(context) {
    context.appendChild(this.node)
    this.moveTo(0)
  }
  moveBefore(other) {
    this.wrapper.insertBefore(this.node, other.node)
    this.moved()
  }
  moveAfter(other) {
    // There's no insertAfter, so insert `this` before the new one, then move the new one before it
    other.wrapper.insertBefore(this.node, other.node)
    other.wrapper.insertBefore(other.node, this.node)
    this.moved()
  }
  moved() {
    this.updateReferences()
  }

  pasteAbove() {
    // let statement = Statement.fromText(navigator.clipboard.readText())
    // statement?.moveBefore(this)
  }
  pasteBelow() {
    // let statement = Statement.fromText(navigator.clipboard.readText())
    // statement?.moveAfter(this)
  }

  remove() {
    this.downReferences().forEach(statement => {
      statement.reference = null
      statement.valid = false
    })
    this.node.remove()
    Statement.all = Statement.all.filter(item => item.id != this.id)
  }

  toggleComment() {
    this.commented = !this.commented
    this.node.classList.toggle("commented", this.commented)
    this.updateReferences()
  }

  dropdownOpts() {
    let dup = { icon: fa("clone regular"), title: "Duplicate", callback: () => this.duplicate() }
    let copy = { icon: fa("regular clipboard"), title: "Copy to Clipboard", callback: () => navigator.clipboard.writeText(this.toString()) }
    let pasteup = { text: "↑", icon: fa("paste regular"), title: "Paste Above", callback: () => this.pasteAbove() }
    let pastedown = { text: "↓", icon: fa("paste regular"), title: "Paste Below", callback: () => this.pasteBelow() }
    let comment = { icon: fa("hashtag"), title: "Toggle Comment", callback: () => this.toggleComment() }

    return [
      [dup, copy, pasteup, pastedown, comment],
      ...Schema.instancesFor(this.returntype).map(method => {
        return {
          text: `#${method.name}`,
          callback: () => {
            (new Statement({
              reference: this,
              type: method.type,
              returntype: method.returntype,
              method: method.name,
              args: method.parsedArgs(),
            })).moveAfter(this)
          }
        }
      })
    ]
  }

  showDropdown() { Dropdown.show(this.dropdownOpts()) }

  get args() {
    return Array.from(this.node.querySelector(".obj-args").children)
  }
  set args(newArgs) {
    let argsContainer = this.node.querySelector(".obj-args")
    newArgs.forEach(item => argsContainer.appendChild(item))
  }
  set argString(str) {
    let vals = Tokenizer.split(str) // ['Default Value', '2']
    let argsContainer = this.node.querySelector(".obj-args")
    let inputs = Array.from(argsContainer.querySelectorAll(":scope > .input-wrapper, :scope > .content"))
    // Statement on create should add the fields based on schema.
    // If no schema- add the default field for each value
    inputs.forEach((wrapper, idx) => {
      let val = vals[idx]
      // if content
      //   split each line, add new statements, move them into children
      if (wrapper.classList.contains("content")) {
        debugger
      } else {
        if (/^[_a-z][0-9A-Za-z_]*$/.test(val)) {
          wrapper.querySelector(".selected-tag").innerText = val
        } else {
          let inputSelector = [
            "input",
            "textarea",
            "select",
          ].map(type => `:scope > ${type}`).join(", ")
          let input = wrapper.querySelector(inputSelector)
          input.value = val
        }
      }
    })

    // "{
    //   abcd = Call.thing()
    //   abcd = Call.thing()
    // }"
    // "\"Hello\", 5"
  }
  argValue(arg, nest) {
    nest = nest || 0
    let tag = arg.querySelector(".selected-tag")?.innerText
    if (tag) { return tag }
    let inputSelector = [
      "input",
      "textarea",
      "select",
    ].map(type => `:scope > ${type}`).join(", ")
    let input = arg.querySelector(inputSelector)

    if (arg.classList.contains("content")) {
      let statements = Array.from(arg.querySelectorAll(":scope > .statement-wrapper"))
      if (statements.length == 0) { return "{}" }
      let indent = "  ".repeat(nest)
      let str = `{\n${indent}  `
      str += statements.map(wrapper => Statement.from(wrapper).toString(nest+1)).join(`\n  ${indent}`)
      str += `\n${indent}}`
      return str
    }

    if (!input) { return } // Words (And, DO, IF, etc...)
    switch (input.tagName.toLowerCase()) {
      case "textarea":
      case "select":
      case "input":
        switch (input.type) {
          case "number": return JSON.stringify(parseFloat(input.value));
          case "checkbox": return JSON.stringify(input.checked);
          default: return JSON.stringify(input.value);
        }
      default:
        console.log(`Unknown value for type:${input.tagName.toLowerCase()}`);
    }
  }

  toString(nest) {
    let str = ""
    if (this._name) { str += `${this._name} = ` }
    if (this._reference) {
      str += `${this._reference.name || this._reference.id}`
    } else {
      str += this.type
    }
    str += `.${this.method}(`
    str += this.args.map(arg => this.argValue(arg, nest)).filter(Boolean).join(", ")
    // iterate through obj-args, pull the value from inputs- when a content block, wrap inside {}
    str += `)::${this.returntype}`
    return str
  }
}
