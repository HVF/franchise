import React from 'react';
import * as U from './update'

let currentState;
let batchDepth = 0;
let isRendering = false;
let renderCallback;

export function get(...combinators){
    if(isRendering) console.warn(new Error('State.get must not be called during render call'));
    return U.get(currentState, ...combinators);
}

export function getAll(...combinators){
    if(isRendering) console.warn(new Error('State.get must not be called during render call'));
    return U.getAll(currentState, ...combinators);
}

export function set(next_state){
    if(isRendering) console.warn(new Error('State.set must not be called during render call'));
    batch(_ => currentState = next_state);
}

export function apply(...combinators){
    set(U.apply(get(), ...combinators))
}

export const batch = fn => batchify(fn)();

export function batchify(fn){
    return function(...args){
        let originalState = currentState;
        batchDepth++;
        try {
            return fn(...args)
        } finally {
            batchDepth--;
            if(batchDepth === 0 && originalState !== currentState && renderCallback) renderCallback();
        }
    }
}

export function Application(render){
    return class Application extends React.Component {
        componentDidUpdate(){ isRendering = false; }
        componentDidMount(){
            isRendering = false;
            renderCallback = e => this.setState({ })
        }
        render(){
            isRendering = true;
            return render(currentState)
        }
    }
}