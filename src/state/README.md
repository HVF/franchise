# Franchise State Management 

## Why?

React's native state system works well for simple components with transient state (e.g. whether you're hovering over a button), but it becomes less useful when you want to be able to do things like coordinate state between multiple components or to export/serialize and load back the state. In Franchise's case, we often want to persist the contents of our cells, the results we're visualizing, and etc. 


A strategy that works for that case is to have a single source of truth at the root of the component hierarchy, and to simply different pieces of that truth to the sub-components through props. We don't want to generally pass all the information to all components, because that eliminates our ability to deliberately not re-render particular subtrees (we don't want to re-render components that don't change for performance reasons). 

In addition, for updates— we could choose to pass each component updater methods for all the pieces of information that they have access to. However, often event handlers and other functions need to be able to modify fairly different parts of the tree than they necessarily need to view. 

This is where the Franchise state management system differs from Redux. To update the state in Redux, you first create an action directly, or with an action creator, that then gets handled by a hierarchy of reducers. For Franchise's system, we just get access to the global state updater and update it however we choose to. 

Also, since we accomplish persistence by serializing the application state— we try to keep it made out of plain objects instead of class values and other tricky stuff. 

For example, the `Cell` component is passed props for view, connect, and deltas — so that when adjacent cells are updated, it doesn't bother re-rendering. Within a render function, no react component has access to state outside of that which it's being passed through its props. Additionally, within a render function we're not allowed to write to the state store (this is just a manifestation of the React no-render-side-effects principle). 

However, within event handlers and other function calls that happen outside of the render loop, we have full access (both read and write) to the entire application state. 

One example of this, is we sometimes need to get access to the current database connector (e.g. SQLite, Postgres, GraphQL, etc). If we're trying to get access within a render method, you'd need to ensure that you're being passed the `.connect.active` part of the state tree and pass it into the `DB()` function (which simply looks up the instance corresponding to that ID). However, if you're in some event handler, or some other piece of code that isn't explicitly in the render domain, you can simply call getDB() (which reads `.connect.active` from the global state store). 


## State Overview

```
config
    graphql
        credentials
            endpoint: "http://whatever"
    sqlite
        credentials
            etc...
    open: true (whether or not the config bar at the top is expanded)

connect
    active: "sqlite" (the ID of the database connector that is currently in use)
    status: "connected"
    error: null

deltas
    changes: [] (a list of changes that that the user has created with the WYSIWYG interface, that can be committed to the database with a synthesized query)
    open: false (whether or not the dialog is expanded)

notebook
    layout[]
        items[]
            error: null (errors associated with running this particular query)
            id: "sdfe8"
            query: "sdf"
            selected: "table" (this is the name of the selected view widget)
            suggestedName: (this is the name of the query that was automatically generated— used for referencing this query from other queries)
            name: (this is the user-input name of a query— used for referencing this query from other queries)
            result
                columns: (array of columns)
                values: (array of rows, each containing an array of values for each column)

trash
    open: false (whether or not the trash view/archived cells pane is expanded)
    cells 
        (the same stuff as within notebook.layout.items)
```

If you're developing with franchise, you can open up the developer console and run STATE.get() to access the current global application state. Outside of the developer console, you'd access with with "State" (and you'll need to import it first)


## Combinator System

The particular way we retrieve and modify state is with a little combinator language— you don't generally need to understand the complete mechanics of it in order to use it (but it's a pretty neat and powerful way of accessing stuff— someone who knows math/haskell better would probably call it a variation of a "Lens"). 

In cell/index.js we have 3 notable functions: cellById, updateCell, and getCell. Note that these functions can only be used outside a render function (event handlers are allowed— as it's not actually being called in render time). You can usually just get by with updateCell(cellId, fieldsToChange) — this basically works the way this.setState does in react components (and it'll automatically trigger a re-render of the app). And likewise, you can use getCell(cellId) if you want to read the contents without explicitly writing to it. 

```
export function cellById(cellId){
    return ['notebook', 'layout', U.each, 'items', U.id(cellId)]
}

export function updateCell(cellId, update){
    State.apply(...cellById(cellId), U.merge(update))
}

export function getCell(cellId){
    return State.get(...cellById(cellId))
}
```


Essentially we have three methods— `State.getAll`, `State.get` and `State.apply`. `State.get` is just shorthand for `State.getAll()[0]`. Each of those arguments is a little function (a "combinator") that chains together to select 0 or more bits of state based on the previous matches. For example, if we look at how cellById works— we start off with "notebook" which is just a shorthand for U.safe_key("notebook"). 

U.safe_key("notebook") returns a function where— if the input is an object, it'll return .notebook— and otherwise null. When we chain U.safe_key("notebook"), U.safe_key("layout") — that's essentially equivalent to .notebook.layout (with the notable difference that it doesn't throw "can not read property of undefined" if notebook doesn't exist). However, chaining doesn't just have to pass a single item forward— in fact it can pass an unlimited number of possibilities forward. So when it gets to U.each— that means at this point we've selected all the different rows of the layout. Then for each of these rows, we select all the columns with U.safe_key("items"). And finally we filter by objects which have an "id" property that matches cellId. 

When using `State.apply` your last argument can be something like U.merge(obj), or U.replace(obj) — where merge merges those fields into the elements at the cursor, and `replace` replaces it altogether. In fact you can also do a custom function which is just an arbitrary reducer: if you've selected a set of numbers that you want to increment, just pass in x => x + 1 as your last argument to increment them all. 

It's a rather powerful system. For instance, if you'd like to prepend the word "hello" to every cell on every other row in the notebook, you could run

```
State.apply("notebook", "layout", U.match((k, i) => i % 2 == 0), "items", "query", k => "hello " + k)
```

You can see the definition of the combinator system at (state/update.js). The core of it is only 10 lines. 