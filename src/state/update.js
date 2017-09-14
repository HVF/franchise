export const def = val => (orig, next) => next(typeof orig === 'undefined' ? val : orig);

export const key = key => (object, next) => ({ ...object, [key]: next(object[key]) });
export const safe_key = key => (object, next) => ({ ...object, [key]: next(typeof object != 'undefined' ? object[key] : undefined) });

export const id = id => (array, next) => array.map(k => k.id === id ? next(k) : k);
export const match = test => (array, next) => array.map(k => test(k) ? next(k) : k);
export const index = index => (array, next) => array.slice(0, index).concat([next(array[index])], array.slice(index + 1));


export const replace = value => (object, next) => value;
export const merge = value => (object, next) => ({ ...object, ...value });

export const removeMatch = test => (array, next) => array.filter(k => !test(k));
export const removeId = id => (array, next) => array.filter(k => k.id !== id);
export const removeIndex = index => (array, next) => array.slice(0, index).concat(array.slice(index + 1));

export const insertAt = (item, index=0) => (array, next) => array.slice(0, index).concat([item], array.slice(index))
export const prepend = item => (array, next) => [item].concat(array);
export const append = item => (array, next) => array.concat([item]);

export const inc = (num, next) => (num || 0) + 1;
export const dec = (num, next) => (num || 0) - 1;

export const toggle = (bool, next) => !bool;

export const each = (array, next) => array.map(next);
export const all = (object, next) => {
    let clone = {}
    for(let key in object) clone[key] = next(object[key]);
    return clone;
}


export function apply(object, ...sequence){
    if(sequence.length === 0) return object;
    return coerce(sequence[0])(object, obj => apply(obj, ...sequence.slice(1)))
}

export function getAll(object, ...sequence){
    let values = []
    apply(object, ...sequence, value => values.push(value))
    return values;
}

export function get(object, ...sequence){
    return getAll(object, ...sequence)[0]
}

function coerce(transform){
    if(typeof transform === 'string') return safe_key(transform);
    if(typeof transform === 'function') return transform;
    return _ => transform;
}
