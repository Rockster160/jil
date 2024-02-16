import Method from "./method.js"

export default class Schema {
  static all = [] // List of all classes
  static types = {} // Key→Val of name→class
  constructor(klass) {
    this.name = klass
    this.inputtype = null
    this.singletons = []
    this.instances = []

    if (!Schema.all.some(type => type.name == this.name)) {
      Schema.all.push(this)
      Schema.types[klass] = this
    }
  }

  get show() { return this.name == "Global" ? "Any" : this.name }

  static funcRegex(flags) {
    return new RegExp([
      /(?:(?<varname>[_a-z][_0-9A-Za-z]*) ?= ?)?/,
      /(?<typename>[A-Z][_0-9A-Za-z]*)/,
      /(?::(?<objname>[_a-z][_0-9A-Za-z]*))?/,
      /\.(?<methodname>[_0-9A-Za-z]+[\!\?]?)/,
      /(?:\((?<args>.*)\))?/,
      /(?:::(?<cast>[A-Z][_0-9A-Za-z|]*))?/,
    ].map(pattern => pattern.source).join(""), flags)
  }

  static load(str) {
    // TODO: Add validations for the string
    let list = str.trim().split("\n")

    new Schema("Global")

    let current
    list.forEach(item => {
      let match
      if (match = item.match(/\[([A-Z][_a-zA-Z0-9]*)\](?:::([\w-]+))?/)) {
        current = this.types[match[1]] || new Schema(match[1])
        if (match[2]) { current.inputtype = match[2] }
      } else if (match = `${current.name}.${item.replace(/  #/, "")}`.match(Schema.funcRegex())) {
        const { methodname, args, cast } = match.groups
        current.addSingletonMethod(new Method({
          type: current.name,
          name: methodname,
          args: args,
          returntype: cast || current.name,
        }))
      } else if (match = `${current.name}.${item.replace(/  \./, "")}`.match(Schema.funcRegex())) {
        const { methodname, args, cast } = match.groups
        current.addInstanceMethod(new Method({
          type: current.name,
          name: methodname,
          args: args,
          returntype: cast || current.name,
        }))
      }
    })
  }

  static instancesFor(type) { return this.types[type]?.instances || [] }

  static globalMethods() {
    return this.all.map(type => {
      return type.singletons
    }).flat()
  }

  static methodFromStr(str) {
    if (!str) { return }
    if (!str.match(/^(?:[A-Z][_a-zA-Z0-9]*)?\.?[a-z][_a-zA-Z0-9]*$/)) { return }
    let [type, method] = str.split(".")
    if (!method && type) { method = type; type = undefined }
    type = (!type || type == "Any") ? "Global" : type
    return this.types[type].singletons.find(singleton => singleton.name == method)
  }

  static method(type, name) {
    if (type && typeof type === "string") { // Class name
      return this.types[type].singletons.find(singleton => singleton.name == name)
    } else { // Statement
      return this.types[type.returntype].instances.find(singleton => singleton.name == name)
    }
  }

  addSingletonMethod(method) {
    this.singletons.push(method)
  }
  addInstanceMethod(method) {
    this.instances.push(method)
  }
}

Schema.load(`
[Global]
  #piece(["second" "minute" "hour" "day" "week" "month" "year"])::Numeric
  #thing(TAB "π" TAB)
  #test(String?("Default Value"):"Bigger Placeholder" "and" Numeric(2))
  #input_data("Input Data")::Hash
  #return(Any?)
  #if("IF" content "DO" content "ELSE" content)::Boolean
  #get(String)::Any
  #set(String Any)::Any
  #get_cache(String)::Any
  #set_cache(String Any)::Any
  #exit("Exit")
  #comment(Text)
  #command(String)::String
  #request("Method" String BR "URL" String BR "Params" Hash BR "Headers" Hash)::Hash
  #broadcastWS(String Hash)::Numeric
  #trigger(String Hash)::Numeric // Trigger vs Broadcast?
  #dowhile(content(["Break" "Next" "Index"::Numeric]))::Numeric
  #loop(content(["Break" "Next" "Index"::Numeric]))::Numeric
  #times(Numeric content(["Break" "Next" "Index"::Numeric]))::Numeric
[Keyval]
  #new(String ": " Any)
[Text]::textarea
  #new(Text)::String
[String]::text
  #new(Any)
  .match(String)
  .scan(String)::Array
  .split(String?)::Array
  .format(["lower" "upper" "squish" "capital" "pascal" "title" "snake" "camel" "base64"])
  .replace(String String)
  .add("+" String)
  .length()::Numeric
[Numeric]::number
  #new(Any::Numeric)
  #pi(TAB "π" TAB)
  #e(TAB "e" TAB)
  #inf()
  #rand(Numeric:min Numeric:max Numeric?:figures)
  .round(Numeric(0))
  .op(["+" "-" "*" "/" "^log"] Numeric)
  .abs
  .sqrt
  .squared
  .cubed
  .log(Numeric)
  .root(Numeric)
  .exp(Numeric)
  .zero?
  .even?
  .odd?
  .prime?
  .whole?
  .positive?
  .negative?
[Boolean]::checkbox
  #new(Any::Boolean)
  #or(Any "||" Any)
  #and(Any "&&" Any)
  #not("NOT" Any)
  #compare(Any ["==" "!=" ">" "<" ">=" "<="] Any)
[Duration]
  #new(String|Numeric ["seconds" "minutes" "hours" "days" "weeks" "months" "years"])
  .add(Duration)
  .subtract(Duration)
[Date]::datetime-local
  #new(Numeric:year Numeric:month Numeric:day Numeric:hour Numeric:min Numeric:sec)
  #now
  .piece(["second" "minute" "hour" "day" "week" "month" "year"])::Numeric
  .add(Duration)
  .subtract(Duration)
  .round("TO" ["beginning" "end"] "OF" ["second" "minute" "hour" "day" "week" "month" "year"])
  .format(String)::String
[Hash]
  #new(content(Keyval [Keyval.new]))
  #keyval(String Any)::Keyval
  .length::Numeric
  .merge(Hash)
  .keys::Array
  .get(String)::Any
  .set(String Any)
  .del(String)
  .each(content(["Key"::Any "Value" "Index"::Numeric)])
  .map(content(["Key"::Any "Value" "Index"::Numeric)])::Array
  .any?(content(["Key"::Any "Value" "Index"::Numeric)])::Boolean
  .none?(content(["Key"::Any "Value" "Index"::Numeric)])::Boolean
  .all?(content(["Key"::Any "Value" "Index"::Numeric)])::Boolean
[Array]
  #new(content)
  .length::Numeric
  .merge
  .get(Numeric)::Any
  .set(Numeric Any)
  .del(Numeric)
  .pop!::Any
  .push!(Any)
  .shift!::Any
  .unshift!(Any)
  .each(content(["Object"::Any "Index"::Numeric)])
  .map(content(["Object"::Any "Index"::Numeric)])
  .find(content(["Object"::Any "Index"::Numeric)])::Any
  .any?(content(["Object"::Any "Index"::Numeric)])::Boolean
  .none?(content(["Object"::Any "Index"::Numeric)])::Boolean
  .all?(content(["Object"::Any "Index"::Numeric)])::Boolean
  .sort_by(content(["Object"::Any "Index"::Numeric)])
  .sort_by!(content(["Object"::Any "Index"::Numeric)])
  .sort(["Ascending" "Descending" "Reverse" "Random"])
  .sort!(["Ascending" "Descending" "Reverse" "Random"])
  .sample::Any
  .min::Any
  .max::Any
  .sum::Any
  .join(String)::String
[List]
  #find(String|Numeric)
  #search(String)::Array
  #create(String)::Boolean
  .name::String
  .update(String?:"Name")::Boolean
  .destroy::Boolean
  .add(String)::Boolean
  .remove(String)::Boolean
  .items::Array
[ListItem]
  #find(String|Numeric)
  #search(String)::Array # All items belonging to user through user lists
  .update(String?:"Name" String?:"Notes" Hash?:"Data")::Boolean
  .name::String
  .notes::String
  .data::Hash
  .destroy::Boolean
[ActionEvent]
  #find(String|Numeric)
  #search(String "limit" Numeric(50) "since" Date? "order" ["ASC" "DESC"])::Array
  #add("name" String "notes" String? "data" Hash? "date" Date?)
  .update("name" String "notes" String? "data" Hash? "date" Date?)::Boolean
  .destroy::Boolean
[Prompt]
  #find(String|Numeric)
  #all("complete?" Boolean(false))::Array
  #create("Title" TAB String BR "Params" TAB Hash? BR "Data" TAB Hash? BR "Questions" content(PromptQuestion))
  .update("Title" TAB String BR "Params" TAB Hash? BR "Data" TAB Hash? BR "Questions" content(PromptQuestion))::Boolean
  .destroy::Boolean
[PromptQuestion] # Maybe have children classes that inherit from this that can be passed along? -- Or just a class for each input type
  #text # Maybe have each of these have a content field where the modifiers are passed in
  #scale
  #checkbox
  #choices
  .default(String)
  .min(Numeric) # All of the below are only for the scale type?
  .max(Numeric)
  .colorMin(Numeric Numeric Numeric)
  .colorMax(Numeric Numeric Numeric)
  .range(Array) # Can be any number of strings that are flex-justified across the scale
[Task]
  #find(String|Numeric)
  #search(String)::Array
  .enable(Boolean(true))::Boolean
  .run(Date?)
[Email]
  #find(String|Numeric)
  #search(String)::Array
  #create("To" TAB String BR "Subject" TAB String BR Text)
  .to::String
  .from::String
  .body::String
  .text::String
  .html::String
  .archive(Boolean(true))::Boolean
`)
