// https://github.com/SortableJS/Sortable
export default function sortable(ele) {
  new Sortable(ele, {
    group: "blocks",
    handle: ".handle",
    animation: 150,
    onStart: function(evt) {
      document.querySelectorAll(".content").forEach(item => {
        let allowed = item.getAttribute("allowed")?.split("|")
        if (allowed && allowed.indexOf("Any") < 0) {
          let statement = Statement.from(evt.item)
          if (allowed.indexOf(statement.returntype) < 0) {
            return // Current object not allowed, don't open
          }
        }
        item.classList.add("open")
      })
    },
    onEnd: function(evt) {
      document.querySelectorAll(".content.open").forEach(item => item.classList.remove("open"))
      let statement = Statement.from(evt.item)
      statement.moved()
    },
    onMove: function(evt) {
      const { related, to, originalEvent } = evt
      if (related.classList.contains("content-dropdown")) {
        if (!evt.willInsertAfter) { // Do not allow elements to be dropped above the dropdown
          originalEvent.preventDefault()
          return false
        }
      }
      let allowed = to.getAttribute("allowed")?.split("|")
      if (to.hasAttribute("allowed")) {
        let allowed = to.getAttribute("allowed").split("|")
        if (allowed && allowed.indexOf("Any") < 0) {
          let statement = Statement.from(evt.dragged)
          if (allowed.indexOf(statement.returntype) < 0) {
            originalEvent.preventDefault()
            return false
          }
        }
      }
    },
  })
  return ele
}
