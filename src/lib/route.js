'use strict';

import ptr from 'path-to-regexp';
import {each, uniqueId} from 'lodash';

class Route {
    constructor(path, fn) {
        this.id = uniqueId('route_');
        this.path = (path === '*') ? '(.*)' : path;
        this.fn = fn;
        this.regexp = ptr(this.path, this.keys = []);
    }

    buildParams(url) {
        var params = this.regexp.exec(url).slice(1),
            result = {};

        if (!params) return false;

        each(this.keys, (k, i) => {
            result[k.name] = decodeURIComponent(params[i]);
        });

        return result;
    }
}

export default Route;
