import { fa, faStack } from "./icon.js"
import { element } from "./form_helpers.js"
import Statement from "./statement.js"
import Dropdown from "./dropdown.js"
import sortable from "./sortable.js"
import Schema from "./schema.js"
import Mouse from "./mouse.js"
import Tokenizer from "./tokenizer.js"

window.Schema = Schema
window.Statement = Statement
window.selected = undefined

window.b = new Statement({
  returntype: "String",
  type: "Global",
  method: "num",
})

window.c = new Statement({
  returntype: "ListItem",
  reference: window.b,
  method: "add",
})

// TODO:
// Boolean input
// Schema: `Any::Numeric` should allow Any in the dropdown, but <input> should be a numeric field
// BUG: When duplicating elements with nested content (IF→IF→Statement), the nested sortable handles get attached to their parents
  // * Might get fixed with new import statements
// Import Statements by new syntax
// Keep track of changes- "save" the last 5-10 modifications. Allow ctrl+z/ctrl+shift+z
// On every change, save in Session Storage - load the Session Storage on page load
// * Temporarily, just to test saving
// Dropdown should be searchable
// Dropdown should have 2|3 columns: Global|Scoped?|Tokens
// * Scoped would be contextual methods: Index, Object, Key, Value, etc
// Dropdowns need a <dynamic> option which opens up token select
// Fix Schema edge cases
// Not sure how Prompt stuff will work...


document.addEventListener("click", function(evt) {
  if (evt.target.matches(".reference") || evt.target.matches(".content-dropdown")) {
    let target = evt.target.closest(".content-dropdown") || evt.target
    let statement = Statement.from(evt.target)
    if (!target.getAttribute("options") && statement) {
      statement.showDropdown()
    } else { // Top-level reference, show global dropdown opts
      const reference = target
      const referenceRect = reference.getBoundingClientRect()
      const leftPosition = (referenceRect.left + referenceRect.width / 2)
      const topPosition = referenceRect.bottom
      const top = !target.closest(".below")

      let addBlock = function(str) {
        let statement = Statement.fromText(str)
        if (top) { statement[0].moveTo(0) }
      }

      let passedOptions = function() {
        let opts = target.getAttribute("options")
        if (!opts) { return }

        let context = target.closest(".content, .wrapper")
        return JSON.parse(opts).map(opt => {
          let method = Schema.methodFromStr(opt)
          if (method) {
            return {
              text: opt,
              callback: () => {
                let statement = new Statement({
                  type: method.type,
                  returntype: method.returntype,
                  method: method.name,
                })
                statement.moveInside(context)
              }
            }
          } else {
            let [word, type] = opt.split("::")
            return {
              text: word,
              callback: () => {
                let statement = new Statement({
                  type: "Global",
                  returntype: type || "None",
                  method: word,
                  args: [element("span", { innerText: word })]
                })
                statement.moveInside(context)
              }
            }
          }
        })
      }

      let globalOptions = function() {
        return Schema.globalMethods().map(method => {
          return {
            text: `${method.type == "Global" ? "" : method.type}.${method.name}`,
            callback: () => {
              let statement = new Statement({
                type: method.type,
                returntype: method.returntype,
                method: method.name,
                args: method.parsedArgs(),
              })
              if (top) { statement.moveTo(0) }
            }
          }
        })
      }

      let paste = {
        icon: fa("paste regular"), title: "Paste",
        callback: () => addBlock(navigator.clipboard.readText())
      }

      Dropdown.showAt(leftPosition, topPosition, [
        [paste],
        ...(passedOptions() || globalOptions())
      ])
    }
  } else if (!evt.target.closest("#reference-dropdown")) {
    const dropdown = document.querySelector("#reference-dropdown")
    Dropdown.hide()
  }
})

document.addEventListener("click", function(evt) {
  if (evt.target.closest(".statement-wrapper")) {
    if (!["INPUT", "SELECT", "TEXTAREA"].indexOf(evt.target.tagName) >= 0) {
      let statement = Statement.from(evt.target)
      console.log(statement.toString());
      if (statement) { statement.selected = !statement.selected }
    }
  } else {
    Statement.clearSelected()
  }
})

document.addEventListener("click", function(evt) {
  if (evt.target.closest(".obj-varname")) {
    let statement = Statement.from(evt.target)
    let newname = window.prompt("Enter new name", statement._name)?.trim()
    if (newname === undefined) { return }

    try {
      statement.name = newname
    } catch (e) {
      return alert(e)
    }
  }
})

document.addEventListener("click", function(evt) {
  if (evt.target.closest(".obj-returntype")) {
    let statement = Statement.from(evt.target)
    Dropdown.show([
      ...Schema.all.map(type => {
        return {
          text: type.show,
          callback: () => statement.returntype = type.show
        }
      })
    ])
  }
})

document.addEventListener("click", function(evt) {
  let btn = evt.target.closest("btn")
  if (btn) {
    let statement = Statement.from(evt.target)
    let tokens = Statement.available(btn)
    let selectedTag = btn.parentElement.querySelector(".selected-tag")
    let defaultOpts = []
    if (!btn.getAttribute("inputtype")?.match(/^(Hash|Array)\??$/)) {
      defaultOpts.push({ text: "<input>", callback: () => selectedTag.innerText = "" })
    }

    Dropdown.show([
      ...defaultOpts,
      ...tokens.map(token => {
        return {
          text: `${token.name}:${token.returntype}`,
          callback: () => selectedTag.innerText = token.name
        }
      })
    ])
  }
})

document.addEventListener("click", function(evt) {
  if (evt.target.closest(".obj-dup")) {
    let statement = Statement.from(evt.target)
    statement?.duplicate()
  }
  if (evt.target.closest(".obj-delete")) {
    let statement = Statement.from(evt.target)
    statement?.remove()
  }
})

window.oncontextmenu = function(evt) {
  evt.preventDefault()
  if (evt.target.closest(".statement-wrapper")) {
    let statement = Statement.from(evt.target)
    statement?.showDropdown()
  }
}

sortable(document.querySelector(".statements"))
