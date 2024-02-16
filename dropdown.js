import Mouse from "./mouse.js"
import { clamp } from "./form_helpers.js"

export default class Dropdown {
  static get node() {
    return document.querySelector("#reference-dropdown")
  }

  static show(opts) { this.showAt(Mouse.x, Mouse.y, opts) }
  static showAt(x, y, opts) {
    this.hide()
    let node = this.node

    this.buildOpts(node, opts)

    node.classList.remove("hidden")

    const dropdownRect = node.getBoundingClientRect()
    const pageWidth = document.documentElement.clientWidth - 20 // 20 to give some padding
    const pageHeight = document.documentElement.clientHeight - 20 // 20 to give some padding

    let height = dropdownRect.height
    if (y + height > pageHeight) { // Overflowing vertically
      height = pageHeight - y
      const minOverflowHeight = clamp(200, 200, pageHeight) // Cap at page height
      if (height < minOverflowHeight && dropdownRect.height > minOverflowHeight) {
        height = minOverflowHeight
        y = pageHeight - height
      }
    }

    let width = dropdownRect.width
    x = x - (width/2) // Center on the desired x
    if (x + width > pageWidth) { // Overflowing vertically
      width = pageWidth - x
      const minOverflowWidth = clamp(200, 200, pageWidth) // Cap at page width
      if (width < minOverflowWidth && dropdownRect.width > minOverflowWidth) {
        width = minOverflowWidth
        x = pageWidth - width
      }
    }

    node.style.top = `${y}px`
    node.style.left = `${x}px`
    node.style.height = `${height}px`
    node.style.width = `${width}px`
  }

  static buildOpts(node, opts) {
    opts.forEach(opt => {
      const ul = node.querySelector("ul")
      const li = document.createElement("li")

      if (Array.isArray(opt)) {
        li.classList.add("horz-list")

        const nestedUl = document.createElement("ul")
        opt.forEach(nopt => {
          const nli = document.createElement("li")
          if (nopt.text) { nli.innerText = nopt.text }
          if (nopt.icon) { nli.appendChild(nopt.icon) }
          if (nopt.title) { nli.title = nopt.title }
          if (nopt.callback && typeof nopt.callback === "function") {
            nli.addEventListener("click", (evt) => {
              evt.preventDefault()
              nopt.callback()
              Dropdown.hide()
            })
          }
          nestedUl.appendChild(nli)
        })
        li.appendChild(nestedUl)
      } else {
        if (opt.text) { li.innerText = opt.text }
        if (opt.icon) { li.appendChild(opt.icon) }
        if (opt.title) { li.title = opt.title }
        if (opt.callback && typeof opt.callback === "function") {
          li.addEventListener("click", (evt) => {
            evt.preventDefault()
            opt.callback()
            Dropdown.hide()
          })
        }
      }
      ul.appendChild(li)
    })
  }

  static hide() {
    this.node.classList.add("hidden")
    this.node.querySelectorAll("li").forEach(li => li.remove())

    this.node.style.height = "auto"
    this.node.style.width = "200px"
  }
}
