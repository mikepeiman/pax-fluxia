import { writable, get } from "svelte/store"

const settingsChange = writable({})

export const storedSettingsChange = {
    subscribe: settingsChange.subscribe,
    set: val => {
        console.log(`🚀 ~ file: stores.js ~ line 8 ~ val`, val)
        settingsChange.set(val);
        localStorage.setItem("settingsChange", JSON.stringify(val));
    },
    get: val => {
        console.log(`🚀 ~ file: stores.js:16 ~ val:`, val)
        return val;
    }
};
export const store_stars = writable([])
export const store_hexCenterCoords = writable([]);
export const store_ctx = writable(null);
export const store_stars_2 = {
    subscribe: store_stars.subscribe,
    set: val => {
        console.log(`🚀 ~ file: stores.js ~ store_stars ~ val`, val)
        settingsChange.set(val);
        localStorage.setItem("store_store_stars", JSON.stringify(val));
    },
    get: store_stars => {
        console.log(`🚀 ~ file: stores.js:16 ~ store_stars:`, store_stars)
        return store_stars;
    }
}