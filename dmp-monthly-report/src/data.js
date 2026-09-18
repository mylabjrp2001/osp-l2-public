import { useEffect, useState } from "react";

let _cache = null;
let _promise = null;
const _listeners = new Set();

function _notify() {
  for (const cb of _listeners) {
    try {
      cb(_cache);
    } catch (e) {
      console.error(e);
    }
  }
}

export function loadData() {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;
  _promise = fetch("/data.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`fetch /data.json -> ${r.status}`);
      return r.json();
    })
    .then((j) => {
      _cache = j;
      _promise = null;
      _notify();
      return j;
    })
    .catch((err) => {
      _promise = null;
      throw err;
    });
  return _promise;
}

// Force re-fetch (call after upload completes).
export function reloadData() {
  _cache = null;
  _promise = null;
  return loadData();
}

export function useData() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let cancel = false;
    loadData()
      .then((data) => {
        if (!cancel) setState({ loading: false, data, error: null });
      })
      .catch((err) => {
        if (!cancel) setState({ loading: false, data: null, error: err });
      });
    const sub = (data) => {
      if (!cancel) setState({ loading: false, data, error: null });
    };
    _listeners.add(sub);
    return () => {
      cancel = true;
      _listeners.delete(sub);
    };
  }, []);
  return state;
}
