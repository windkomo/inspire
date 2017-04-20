webpackJsonp([1],[
/* 0 */,
/* 1 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function() {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		var result = [];
		for(var i = 0; i < this.length; i++) {
			var item = this[i];
			if(item[2]) {
				result.push("@media " + item[2] + "{" + item[1] + "}");
			} else {
				result.push(item[1]);
			}
		}
		return result.join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};


/***/ }),
/* 2 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var stylesInDom = {},
	memoize = function(fn) {
		var memo;
		return function () {
			if (typeof memo === "undefined") memo = fn.apply(this, arguments);
			return memo;
		};
	},
	isOldIE = memoize(function() {
		return /msie [6-9]\b/.test(self.navigator.userAgent.toLowerCase());
	}),
	getHeadElement = memoize(function () {
		return document.head || document.getElementsByTagName("head")[0];
	}),
	singletonElement = null,
	singletonCounter = 0,
	styleElementsInsertedAtTop = [];

module.exports = function(list, options) {
	if(typeof DEBUG !== "undefined" && DEBUG) {
		if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};
	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (typeof options.singleton === "undefined") options.singleton = isOldIE();

	// By default, add <style> tags to the bottom of <head>.
	if (typeof options.insertAt === "undefined") options.insertAt = "bottom";

	var styles = listToStyles(list);
	addStylesToDom(styles, options);

	return function update(newList) {
		var mayRemove = [];
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			domStyle.refs--;
			mayRemove.push(domStyle);
		}
		if(newList) {
			var newStyles = listToStyles(newList);
			addStylesToDom(newStyles, options);
		}
		for(var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];
			if(domStyle.refs === 0) {
				for(var j = 0; j < domStyle.parts.length; j++)
					domStyle.parts[j]();
				delete stylesInDom[domStyle.id];
			}
		}
	};
}

function addStylesToDom(styles, options) {
	for(var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];
		if(domStyle) {
			domStyle.refs++;
			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}
			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];
			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}
			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles(list) {
	var styles = [];
	var newStyles = {};
	for(var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};
		if(!newStyles[id])
			styles.push(newStyles[id] = {id: id, parts: [part]});
		else
			newStyles[id].parts.push(part);
	}
	return styles;
}

function insertStyleElement(options, styleElement) {
	var head = getHeadElement();
	var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
	if (options.insertAt === "top") {
		if(!lastStyleElementInsertedAtTop) {
			head.insertBefore(styleElement, head.firstChild);
		} else if(lastStyleElementInsertedAtTop.nextSibling) {
			head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			head.appendChild(styleElement);
		}
		styleElementsInsertedAtTop.push(styleElement);
	} else if (options.insertAt === "bottom") {
		head.appendChild(styleElement);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement(styleElement) {
	styleElement.parentNode.removeChild(styleElement);
	var idx = styleElementsInsertedAtTop.indexOf(styleElement);
	if(idx >= 0) {
		styleElementsInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement(options) {
	var styleElement = document.createElement("style");
	styleElement.type = "text/css";
	insertStyleElement(options, styleElement);
	return styleElement;
}

function createLinkElement(options) {
	var linkElement = document.createElement("link");
	linkElement.rel = "stylesheet";
	insertStyleElement(options, linkElement);
	return linkElement;
}

function addStyle(obj, options) {
	var styleElement, update, remove;

	if (options.singleton) {
		var styleIndex = singletonCounter++;
		styleElement = singletonElement || (singletonElement = createStyleElement(options));
		update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
		remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
	} else if(obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function") {
		styleElement = createLinkElement(options);
		update = updateLink.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
			if(styleElement.href)
				URL.revokeObjectURL(styleElement.href);
		};
	} else {
		styleElement = createStyleElement(options);
		update = applyToTag.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
		};
	}

	update(obj);

	return function updateStyle(newObj) {
		if(newObj) {
			if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
				return;
			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;
		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag(styleElement, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = styleElement.childNodes;
		if (childNodes[index]) styleElement.removeChild(childNodes[index]);
		if (childNodes.length) {
			styleElement.insertBefore(cssNode, childNodes[index]);
		} else {
			styleElement.appendChild(cssNode);
		}
	}
}

function applyToTag(styleElement, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		styleElement.setAttribute("media", media)
	}

	if(styleElement.styleSheet) {
		styleElement.styleSheet.cssText = css;
	} else {
		while(styleElement.firstChild) {
			styleElement.removeChild(styleElement.firstChild);
		}
		styleElement.appendChild(document.createTextNode(css));
	}
}

function updateLink(linkElement, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	if(sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = linkElement.href;

	linkElement.href = URL.createObjectURL(blob);

	if(oldSrc)
		URL.revokeObjectURL(oldSrc);
}


/***/ }),
/* 3 */,
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchMetrics = fetchMetrics;
exports.fetchCatalog = fetchCatalog;
exports.fetchCatalogs = fetchCatalogs;
exports.fetchHarvest = fetchHarvest;
exports.fetchHarvests = fetchHarvests;
exports.fetchGlobalMetrics = fetchGlobalMetrics;
exports.fetchDataset = fetchDataset;
exports.fetchGeoJSON = fetchGeoJSON;
exports.search = search;
exports.getUser = getUser;
exports.getOrganization = getOrganization;
exports.getOrganizationDetail = getOrganizationDetail;
exports.fetchOrganizationMetrics = fetchOrganizationMetrics;
exports.fetchOrganizationPublished = fetchOrganizationPublished;
exports.fetchOrganizationNotPublishedYet = fetchOrganizationNotPublishedYet;
exports.fetchOrganizationPublishedByOthers = fetchOrganizationPublishedByOthers;
exports.publishDataset = publishDataset;
exports.updateOrganizationAccount = updateOrganizationAccount;
exports.syncCatalog = syncCatalog;
exports.getProducers = getProducers;
exports.getOrganizationProducers = getOrganizationProducers;
exports.dissociateProducer = dissociateProducer;
exports.associateProducer = associateProducer;
exports.getProducersToAssociate = getProducersToAssociate;
exports.getOrganizations = getOrganizations;
exports.getDataGouvPublication = getDataGouvPublication;
exports.getDatasetOnDataGouv = getDatasetOnDataGouv;
exports.getDiscussions = getDiscussions;

var _qs = __webpack_require__(68);

var _qs2 = _interopRequireDefault(_qs);

var _super = __webpack_require__(229);

var _manageFilters = __webpack_require__(50);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function fetchMetrics(catalogId) {
  if (!catalogId) return Promise.reject(new Error('catalogId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/api/geogw/catalogs/' + catalogId + '/metrics');
}

function fetchCatalog(catalogId) {
  if (!catalogId) return Promise.reject(new Error('catalogId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/api/geogw/catalogs/' + catalogId);
}

function fetchCatalogs() {
  return (0, _super._get)('https://inspire.data.gouv.fr/api/geogw/catalogs');
}

function fetchHarvest(catalogId, harvestId) {
  if (!catalogId) return Promise.reject(new Error('catalogId is required'));
  if (!harvestId) return Promise.reject(new Error('harvestId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/api/geogw/services/' + catalogId + '/synchronizations/' + harvestId);
}

function fetchHarvests(catalogId) {
  if (!catalogId) return Promise.reject(new Error('catalogId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/api/geogw/services/' + catalogId + '/synchronizations');
}

function fetchGlobalMetrics() {
  return (0, _super._get)('https://inspire.data.gouv.fr/dgv/api/datasets/metrics');
}

function fetchDataset(datasetId) {
  if (!datasetId) return Promise.reject(new Error('datasetId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/api/geogw/records/' + datasetId);
}

function fetchGeoJSON(link) {
  if (!link) return Promise.reject(new Error('link is required'));
  return (0, _super._get)(link + '?format=GeoJSON&projection=WGS84');
}

function search(q, filters, offset) {
  var qsFilters = (0, _manageFilters.convertFilters)(filters);
  var query = _qs2.default.stringify(Object.assign({ q: q, offset: offset }, qsFilters), { indices: false });

  return (0, _super._get)('https://inspire.data.gouv.fr/api/geogw/records?' + query);
}

function getUser() {
  return (0, _super._get)('https://inspire.data.gouv.fr/dgv/api/me');
}

function getOrganization(organizationId) {
  if (!organizationId) return Promise.reject(new Error('organizationId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/dgv/api/organizations/' + organizationId);
}

function getOrganizationDetail(organizationId) {
  if (!organizationId) return Promise.reject(new Error('organizationId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/dgv/api/organizations/' + organizationId + '/profile');
}

function fetchOrganizationMetrics(organizationId) {
  if (!organizationId) return Promise.reject(new Error('organizationId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/dgv/api/organizations/' + organizationId + '/datasets/metrics');
}

function fetchOrganizationPublished(organizationId) {
  if (!organizationId) return Promise.reject(new Error('organizationId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/dgv/api/organizations/' + organizationId + '/datasets/published');
}

function fetchOrganizationNotPublishedYet(organizationId) {
  if (!organizationId) return Promise.reject(new Error('organizationId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/dgv/api/organizations/' + organizationId + '/datasets/not-published-yet');
}

function fetchOrganizationPublishedByOthers(organizationId) {
  if (!organizationId) return Promise.reject(new Error('organizationId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/dgv/api/organizations/' + organizationId + '/datasets/published-by-others');
}

function publishDataset(datasetId, organizationId) {
  if (!datasetId) return Promise.reject(new Error('datasetId is required'));
  if (!organizationId) return Promise.reject(new Error('organizationId is required'));
  var url = 'https://inspire.data.gouv.fr/dgv/api/datasets/' + datasetId + '/publication';

  return (0, _super._put)(url, { organization: organizationId });
}

function updateOrganizationAccount(organizationId) {
  var organization = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!organizationId) return Promise.reject(new Error('organizationId is required'));
  var url = 'https://inspire.data.gouv.fr/dgv/api/organizations/' + organizationId;
  return (0, _super._put)(url, organization);
}

function syncCatalog(catalogId) {
  if (!catalogId) return Promise.reject(new Error('catalogId is required'));
  return (0, _super._post)('https://inspire.data.gouv.fr/api/geogw/services/' + catalogId + '/sync');
}

function getProducers() {
  return (0, _super._get)('https://inspire.data.gouv.fr/dgv/api/producers');
}

function getOrganizationProducers(organizationId) {
  if (!organizationId) return Promise.reject(new Error('organizationId is required'));
  return (0, _super._get)('https://inspire.data.gouv.fr/dgv/api/organizations/' + organizationId + '/producers');
}

function dissociateProducer(producerId, organizationId) {
  if (!producerId && organizationId) return Promise.reject(new Error('producerId and organizationId is required'));
  var url = 'https://inspire.data.gouv.fr/dgv/api/organizations/' + organizationId + '/producers/' + producerId;

  return (0, _super._delete)(url);
}

function associateProducer(producerId, organizationId) {
  if (!producerId && organizationId) return Promise.reject(new Error('producerId and organizationId is required'));
  var url = 'https://inspire.data.gouv.fr/dgv/api/organizations/' + organizationId + '/producers';
  var params = { '_id': producerId };

  return (0, _super._post)(url, params);
}

function getProducersToAssociate(catalogId) {
  if (!catalogId) return Promise.reject(new Error('catalogId is required'));
  var url = 'https://inspire.data.gouv.fr/api/geogw/services/' + catalogId + '/records?resultParts=facets&opendata=yes&availability=yes&facets[keyword]=0';

  return (0, _super._get)(url);
}

function getOrganizations(organizationsId) {
  return Promise.all(organizationsId.map(function (id) {
    return getOrganization(id);
  }));
}

function getDataGouvPublication(datasetId) {
  if (!datasetId) return Promise.reject(new Error('datasetId is required'));
  var url = 'https://inspire.data.gouv.fr/api/geogw/records/' + datasetId + '/publications';

  return (0, _super._get)(url).then(function (p) {
    return p.find(function (pub) {
      return pub.target === 'dgv';
    });
  });
}

// DATA.GOUV.FR
function getDatasetOnDataGouv(datasetId) {
  if (!datasetId) return Promise.reject(new Error('datasetId is required'));
  var url = 'https://www.data.gouv.fr/api/1/datasets/' + datasetId + '/';

  return (0, _super._get)(url);
}

function getDiscussions(datasetId) {
  if (!datasetId) return Promise.reject(new Error('datasetId is required'));
  var url = 'https://www.data.gouv.fr/api/1/discussions/?for=' + datasetId;

  return (0, _super._get)(url);
}

/***/ }),
/* 5 */,
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cancelAllPromises = cancelAllPromises;
exports.markAsCancelable = markAsCancelable;
exports.waitForDataAndSetState = waitForDataAndSetState;

var _promises = __webpack_require__(126);

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function cancelAllPromises(component) {
  if (!component.cancelablePromises) return;
  return (0, _promises.cancelAll)(component.cancelablePromises);
}

function markAsCancelable(promise, component) {
  var cancelablePromise = (0, _promises.makeCancelable)(promise);
  if (!component.cancelablePromises) component.cancelablePromises = [];
  component.cancelablePromises.push(cancelablePromise);
  return cancelablePromise;
}

function waitForDataAndSetState(dataPromise, component, stateName) {
  var cancelablePromise = markAsCancelable(dataPromise, component);

  return cancelablePromise.promise.then(function (data) {
    var update = {};
    update[stateName] = data;
    component.setState(update);
  }).catch(function (err) {
    if (err.isCanceled) return;
    if (!component.state.errors.includes(err.message)) {
      var errors = [].concat(_toConsumableArray(component.state.errors), [err.message]);
      component.setState({ errors: errors });
    }
  });
}

/***/ }),
/* 7 */,
/* 8 */,
/* 9 */,
/* 10 */,
/* 11 */,
/* 12 */,
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDocumentTitle = __webpack_require__(10);

var _reactDocumentTitle2 = _interopRequireDefault(_reactDocumentTitle);

var _Errors = __webpack_require__(630);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Errors = function Errors(_ref) {
  var errors = _ref.errors;

  var title = errors.length > 1 ? _react2.default.createElement(
    'h3',
    null,
    'Des erreurs sont survenues'
  ) : _react2.default.createElement(
    'h3',
    null,
    'Une erreur est survenue'
  );
  return _react2.default.createElement(
    _reactDocumentTitle2.default,
    { title: 'Erreur' },
    _react2.default.createElement(
      'div',
      { className: _Errors.container },
      title,
      _react2.default.createElement(
        'ul',
        null,
        errors.map(function (error, idx) {
          return _react2.default.createElement(
            'li',
            { key: idx },
            error
          );
        })
      )
    )
  );
};

exports.default = Errors;

/***/ }),
/* 14 */,
/* 15 */,
/* 16 */,
/* 17 */,
/* 18 */,
/* 19 */,
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _CircularProgress = __webpack_require__(210);

var _CircularProgress2 = _interopRequireDefault(_CircularProgress);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ContentLoader = function ContentLoader(_ref) {
  var _ref$style = _ref.style,
      style = _ref$style === undefined ? {} : _ref$style,
      _ref$size = _ref.size,
      size = _ref$size === undefined ? 2 : _ref$size;

  return _react2.default.createElement(_CircularProgress2.default, { style: style, size: size });
};

exports.default = ContentLoader;

/***/ }),
/* 21 */,
/* 22 */,
/* 23 */,
/* 24 */,
/* 25 */,
/* 26 */,
/* 27 */,
/* 28 */,
/* 29 */,
/* 30 */,
/* 31 */,
/* 32 */,
/* 33 */,
/* 34 */,
/* 35 */,
/* 36 */,
/* 37 */,
/* 38 */,
/* 39 */,
/* 40 */,
/* 41 */,
/* 42 */,
/* 43 */,
/* 44 */,
/* 45 */,
/* 46 */,
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get2 = __webpack_require__(63);

var _get3 = _interopRequireDefault(_get2);

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _LastHarvestStatus = __webpack_require__(124);

var _LastHarvestStatus2 = _interopRequireDefault(_LastHarvestStatus);

var _Counter = __webpack_require__(75);

var _Counter2 = _interopRequireDefault(_Counter);

var _Percent = __webpack_require__(76);

var _Percent2 = _interopRequireDefault(_Percent);

var _ObsoleteWarning = __webpack_require__(207);

var _ObsoleteWarning2 = _interopRequireDefault(_ObsoleteWarning);

var _CatalogPreview = __webpack_require__(625);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CatalogPreview = function CatalogPreview(_ref) {
  var catalog = _ref.catalog;

  var metrics = catalog.metrics;
  var openness = (0, _get3.default)(metrics, 'datasets.partitions.openness.yes', 0);
  var download = (0, _get3.default)(metrics, 'datasets.partitions.download.yes', 0);

  var metricsPreview = !metrics ? _react2.default.createElement(
    'div',
    null,
    'Aucun donn\xE9e disponible'
  ) : _react2.default.createElement(
    'div',
    { className: _CatalogPreview.container },
    _react2.default.createElement(_Percent2.default, { value: openness, total: metrics.datasets.totalCount, size: 'small', label: 'Donn\xE9es ouvertes', icon: 'unlock alternate icon' }),
    _react2.default.createElement(_Percent2.default, { value: download, total: metrics.datasets.totalCount, size: 'small', label: 'T\xE9l\xE9chargeable', icon: 'download' }),
    _react2.default.createElement(_Counter2.default, { value: metrics.records.totalCount, size: 'small', label: 'Enregistrements' })
  );

  return _react2.default.createElement(
    _reactRouter.Link,
    { to: '/catalogs/' + catalog._id, className: _CatalogPreview.link },
    _react2.default.createElement(
      'div',
      { className: _CatalogPreview.paper },
      _react2.default.createElement(
        'div',
        { className: _CatalogPreview.title },
        catalog.name
      ),
      _react2.default.createElement(_LastHarvestStatus2.default, { harvest: catalog.service.sync }),
      _react2.default.createElement(_ObsoleteWarning2.default, { catalog: catalog }),
      metricsPreview
    )
  );
};

exports.default = CatalogPreview;

/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkLicense = checkLicense;
exports.getLicense = getLicense;
exports.checkProducers = checkProducers;
exports.checkDataAvailability = checkDataAvailability;
var ACCEPTED_LICENSES = exports.ACCEPTED_LICENSES = {
  'fr-lo': { name: 'Licence Ouverte', link: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence' },
  'fr-loa': { name: 'Licence Ouverte Administrations', link: 'https://www.etalab.gouv.fr/nouvelle-licence-pour-la-reutilisation-des-informations-publiques-elements-de-clarification' },
  'odbl': { name: 'Open Database License (ODbL 1.0)', link: 'https://vvlibri.org/fr/licence/odbl/10/fr' }
};

function checkLicense(license) {
  if (!license || !ACCEPTED_LICENSES[license]) return false;
  return true;
}

function getLicense(license) {
  if (!license) return 'non déterminée';
  if (!checkLicense(license)) return 'inconnue';
  return ACCEPTED_LICENSES[license];
}

function checkProducers(organizations) {
  if (!!organizations && organizations.length > 0) return true;
  return false;
}

function checkDataAvailability(distributions) {
  if (!!distributions && distributions.some(function (distribution) {
    return distribution.available;
  })) {
    return true;
  }
  return false;
}

/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.doneSince = doneSince;

var _moment = __webpack_require__(11);

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function doneSince(endTime) {
  var endDate = new Date(endTime).getTime();
  if (!isNaN(endDate)) {
    var since = (0, _moment2.default)(endDate).fromNow();
    if (since !== 'Invalid Date') return since;
  }
  return 'N/A';
}

/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filterTradTable = undefined;

var _some2 = __webpack_require__(551);

var _some3 = _interopRequireDefault(_some2);

var _isEqual2 = __webpack_require__(105);

var _isEqual3 = _interopRequireDefault(_isEqual2);

var _find2 = __webpack_require__(163);

var _find3 = _interopRequireDefault(_find2);

var _unionWith2 = __webpack_require__(556);

var _unionWith3 = _interopRequireDefault(_unionWith2);

var _remove2 = __webpack_require__(550);

var _remove3 = _interopRequireDefault(_remove2);

exports.translateFilters = translateFilters;
exports.addFilter = addFilter;
exports.removeFilter = removeFilter;
exports.replaceFilter = replaceFilter;
exports.isActive = isActive;
exports.convertFilters = convertFilters;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var filterTradTable = exports.filterTradTable = {
  availability: 'téléchargeable',
  dgvPublication: 'publié sur data.gouv.fr',
  distributionFormat: 'format de distribution',
  keyword: 'mot-clé',
  metadataType: 'type de metadonnée',
  opendata: 'donnée ouverte',
  organization: 'organisation',
  representationType: 'type géographique',
  type: 'type',
  catalog: 'catalogue',
  yes: 'oui',
  no: 'non',
  'not-determined': 'non déterminé',
  other: 'autre',
  unknown: 'inconnu',
  none: 'aucun'
};

function translateFilters(filter) {
  return filterTradTable[filter] || filter;
}

function addFilter(oldFilters, newFilter) {
  return (0, _unionWith3.default)(oldFilters, [newFilter], _isEqual3.default);
}

function removeFilter(oldFilters, newFilter) {
  (0, _remove3.default)(oldFilters, newFilter);

  return oldFilters;
}

function replaceFilter(oldFilters, newFilter) {
  var filter = (0, _find3.default)(oldFilters, function (filter) {
    return filter.name === newFilter.name;
  });

  if (!filter) return addFilter(oldFilters, newFilter);
  filter.value = newFilter.value;

  return oldFilters;
}

function isActive(filters, filter) {
  return (0, _some3.default)(filters, filter);
}

function convertFilters(filters) {
  var reducedFilters = [];
  if (filters) {
    reducedFilters = filters.reduce(function (acc, current) {
      if (!acc[current.name]) acc[current.name] = [];
      acc[current.name].push(current.value);
      return acc;
    }, {});
  }
  return reducedFilters;
}

/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _reactDocumentTitle = __webpack_require__(10);

var _reactDocumentTitle2 = _interopRequireDefault(_reactDocumentTitle);

var _User = __webpack_require__(225);

var _User2 = _interopRequireDefault(_User);

var _Layout = __webpack_require__(691);

var _Layout2 = _interopRequireDefault(_Layout);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Layout(_ref) {
  var user = _ref.user,
      organization = _ref.organization,
      pageTitle = _ref.pageTitle,
      title = _ref.title,
      children = _ref.children;

  if (!user) return null;
  var organizationLogo = organization && organization.logo ? organization.logo : '/assets/no-img.png';

  return _react2.default.createElement(
    _reactDocumentTitle2.default,
    { title: pageTitle },
    _react2.default.createElement(
      'div',
      { className: _Layout2.default.publishing },
      _react2.default.createElement(_User2.default, { user: user }),
      organization ? _react2.default.createElement(
        _reactRouter.Link,
        { to: '/publication/' + organization.id },
        _react2.default.createElement('img', { className: _Layout2.default.organizationLogo, alt: 'organization logo', src: organizationLogo })
      ) : null,
      _react2.default.createElement(
        'div',
        { className: _Layout2.default.container },
        _react2.default.createElement(
          'h3',
          null,
          title
        ),
        children
      )
    )
  );
}

exports.default = Layout;

/***/ }),
/* 52 */,
/* 53 */,
/* 54 */,
/* 55 */,
/* 56 */,
/* 57 */,
/* 58 */,
/* 59 */,
/* 60 */,
/* 61 */,
/* 62 */,
/* 63 */,
/* 64 */,
/* 65 */,
/* 66 */,
/* 67 */
/***/ (function(module, exports) {

/**
 * Ensure some object is a coerced to a string
 **/
module.exports = function makeString(object) {
  if (object == null) return '';
  return '' + object;
};


/***/ }),
/* 68 */,
/* 69 */,
/* 70 */,
/* 71 */,
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Filter = __webpack_require__(73);

var _Filter2 = _interopRequireDefault(_Filter);

var _Facet = __webpack_require__(632);

var _Facet2 = _interopRequireDefault(_Facet);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Facet = function (_Component) {
  _inherits(Facet, _Component);

  function Facet() {
    _classCallCheck(this, Facet);

    return _possibleConstructorReturn(this, (Facet.__proto__ || Object.getPrototypeOf(Facet)).apply(this, arguments));
  }

  _createClass(Facet, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          style = _props.style,
          name = _props.name,
          value = _props.value,
          count = _props.count,
          addFilter = _props.addFilter,
          isActive = _props.isActive;


      if (isActive) {
        return null;
      }

      var onClick = null;
      var filter = { name: name, value: value };

      if (addFilter) {
        onClick = function onClick() {
          return addFilter(filter);
        };
      }

      return _react2.default.createElement(
        'div',
        { style: style, className: _Facet2.default.container },
        _react2.default.createElement(_Filter2.default, { filter: filter, onClick: onClick }),
        count ? _react2.default.createElement(
          'span',
          { className: _Facet2.default.count },
          'x\xA0',
          count
        ) : null
      );
    }
  }]);

  return Facet;
}(_react.Component);

exports.default = Facet;

/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _manageFilters = __webpack_require__(50);

var _Filter = __webpack_require__(634);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Filter = function Filter(props) {
  var detail = props.detail,
      remove = props.remove,
      filter = props.filter,
      style = props.style,
      _onClick = props.onClick;

  var title = (0, _manageFilters.translateFilters)(filter.name);
  var value = (0, _manageFilters.translateFilters)(filter.value);

  return _react2.default.createElement(
    'button',
    { className: _Filter.link, title: title + ': ' + value, style: style, onClick: function onClick() {
        return _onClick && _onClick(filter);
      } },
    _react2.default.createElement(
      'span',
      null,
      detail && title + ':'
    ),
    _react2.default.createElement(
      'span',
      { className: _Filter.filterValue },
      value
    ),
    remove && _react2.default.createElement(
      'span',
      null,
      '\xA0',
      _react2.default.createElement('i', { className: 'remove icon' })
    )
  );
};

exports.default = Filter;

/***/ }),
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _SearchInput = __webpack_require__(646);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SearchInput = function (_Component) {
  _inherits(SearchInput, _Component);

  function SearchInput(props) {
    _classCallCheck(this, SearchInput);

    var _this = _possibleConstructorReturn(this, (SearchInput.__proto__ || Object.getPrototypeOf(SearchInput)).call(this, props));

    _this.state = { textInput: props.textInput || '' };
    return _this;
  }

  _createClass(SearchInput, [{
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if (!nextProps.textInput || this.props.textInput === nextProps.textInput) return;
      this.setState({ textInput: nextProps.textInput });
    }
  }, {
    key: 'onChange',
    value: function onChange(event) {
      this.setState({ textInput: event.target.value });
    }
  }, {
    key: 'onKeyPress',
    value: function onKeyPress(event) {
      if (event.key === 'Enter') {
        this.props.onSearch(this.state.textInput);
      }
    }
  }, {
    key: 'search',
    value: function search() {
      this.props.onSearch(this.state.textInput);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var placeholder = this.props.placeholder;


      return _react2.default.createElement(
        'div',
        { className: _SearchInput.wrapper },
        _react2.default.createElement('input', {
          type: 'text',
          value: this.state.textInput,
          className: _SearchInput.input,
          onChange: function onChange(e) {
            return _this2.onChange(e);
          },
          onKeyPress: function onKeyPress(e) {
            return _this2.onKeyPress(e);
          },
          placeholder: placeholder ? placeholder : 'Rechercher...' }),
        this.props.searchButton ? _react2.default.createElement(
          'button',
          { className: _SearchInput.button, onClick: function onClick() {
              return _this2.search();
            } },
          'Rechercher'
        ) : undefined
      );
    }
  }]);

  return SearchInput;
}(_react.Component);

exports.default = SearchInput;

/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _classnames = __webpack_require__(81);

var _classnames2 = _interopRequireDefault(_classnames);

var _Counter = __webpack_require__(649);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Counter = function Counter(_ref) {
  var _cx, _cx2;

  var value = _ref.value,
      label = _ref.label,
      _ref$unit = _ref.unit,
      unit = _ref$unit === undefined ? '' : _ref$unit,
      _ref$size = _ref.size,
      size = _ref$size === undefined ? '' : _ref$size,
      _ref$color = _ref.color,
      color = _ref$color === undefined ? '' : _ref$color,
      _ref$icon = _ref.icon,
      icon = _ref$icon === undefined ? '' : _ref$icon,
      _ref$title = _ref.title,
      title = _ref$title === undefined ? '' : _ref$title;

  var labelSize = (0, _classnames2.default)(_Counter.medium, (_cx = {}, _defineProperty(_cx, _Counter.large, size === 'large'), _defineProperty(_cx, _Counter.small, size === 'small'), _cx));

  var labelColor = (0, _classnames2.default)(_Counter.medium, (_cx2 = {}, _defineProperty(_cx2, _Counter.success, color === 'success'), _defineProperty(_cx2, _Counter.warning, color === 'warning'), _defineProperty(_cx2, _Counter.error, color === 'error'), _cx2));

  var labelStyle = size === 'small' ? _Counter.small : _Counter.defaultLabel;

  var titleDiv = title ? _react2.default.createElement(
    'h3',
    null,
    title
  ) : null;
  var iconDiv = icon ? _react2.default.createElement('i', { className: icon + ' icon' }) : null;
  var valueDiv = _react2.default.createElement(
    'div',
    { className: labelColor + ' ' + labelSize },
    iconDiv,
    ' ',
    value ? value : '0',
    ' ',
    unit
  );
  var labelDiv = label ? _react2.default.createElement(
    'div',
    { className: labelStyle },
    label
  ) : null;

  return _react2.default.createElement(
    'div',
    { className: _Counter.container },
    titleDiv,
    valueDiv,
    labelDiv
  );
};

exports.default = Counter;

/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Counter = __webpack_require__(75);

var _Counter2 = _interopRequireDefault(_Counter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var color = function color(percent) {
  if (percent < 20) {
    return 'error';
  } else if (percent > 55) {
    return 'success';
  } else {
    return 'warning';
  }
};

var Percent = function Percent(props) {
  var value = props.value,
      total = props.total;

  var percent = value ? Math.floor(value / total * 100) : 0;

  return _react2.default.createElement(_Counter2.default, Object.assign({}, props, {
    value: percent,
    unit: '%',
    color: color(percent) }));
};

exports.default = Percent;

/***/ }),
/* 77 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get2 = __webpack_require__(63);

var _get3 = _interopRequireDefault(_get2);

var _filter2 = __webpack_require__(538);

var _filter3 = _interopRequireDefault(_filter2);

var _sortBy2 = __webpack_require__(170);

var _sortBy3 = _interopRequireDefault(_sortBy2);

exports.getCandidateCatalogs = getCandidateCatalogs;
exports.getCatalogOrderByScore = getCatalogOrderByScore;
exports.isObsolete = isObsolete;
exports.computeFreshnessScore = computeFreshnessScore;
exports.computeDownloadableScore = computeDownloadableScore;
exports.computeOpenScore = computeOpenScore;
exports.computeCatalogScore = computeCatalogScore;

var _moment = __webpack_require__(11);

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getCandidateCatalogs(catalogs, sourceCatalogs) {
  return (0, _filter3.default)(catalogs, function (catalog) {
    return !sourceCatalogs.includes(catalog.id) && (0, _get3.default)(catalog, 'metrics.datasets.partitions.openness.yes', 0) >= 1 && (0, _get3.default)(catalog, 'metrics.datasets.partitions.download.yes', 0) >= 1;
  });
}

function getCatalogOrderByScore(catalogs) {
  return (0, _sortBy3.default)(catalogs, function (catalog) {
    return -computeCatalogScore(catalog);
  });
}

function isObsolete(catalog) {
  var currentDate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Date();

  var mostRecentRevisionDate = (0, _get3.default)(catalog, 'metrics.mostRecentRevisionDate');
  if (!mostRecentRevisionDate) return;
  return (0, _moment2.default)(currentDate).subtract(6, 'months').isAfter(mostRecentRevisionDate);
}

function computeFreshnessScore(mostRecentRevisionDate) {
  var currentDate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Date();

  if (!mostRecentRevisionDate) return 1;
  if ((0, _moment2.default)(currentDate).subtract(1, 'months').isBefore(mostRecentRevisionDate)) return 100;
  if ((0, _moment2.default)(currentDate).subtract(6, 'months').isBefore(mostRecentRevisionDate)) return 10;
  return 1;
}

function computeDownloadableScore(percentDownloadable) {
  var v = Math.max(Math.min(percentDownloadable, 100), 1);
  return v * v;
}

function computeOpenScore(percentOpen) {
  return Math.max(Math.min(percentOpen, 100), 1);
}

function computeCatalogScore(catalog, currentDate) {
  var total = (0, _get3.default)(catalog.metrics, 'datasets.totalCount', 0);
  if (total === 0) return 0;

  var percentOpen = (0, _get3.default)(catalog.metrics, 'datasets.partitions.openness.yes', 0) / total * 100;
  var percentDownloadable = (0, _get3.default)(catalog.metrics, 'datasets.partitions.download.yes', 0) / total * 100;

  return computeFreshnessScore(catalog.metrics.mostRecentRevisionDate, currentDate) * computeDownloadableScore(percentDownloadable) * computeOpenScore(percentOpen);
}

/***/ }),
/* 78 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var statusTranslate = exports.statusTranslate = {
  completed: { status: 'terminée' },
  historicalArchive: { status: 'archivée' },
  obsolete: { status: 'obsolète', consequences: 'Cette fiche n\'est plus à jour et présente des données obsolètes.' },
  onGoing: { status: 'en cours' },
  planned: { status: 'planifiée' },
  required: { status: 'mise à jour requise' },
  underDevelopment: { status: ' en construction', consequences: 'Certaines données peuvent être erronées ou vont subir des changements.' }
};

/***/ }),
/* 79 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _CheckItem = __webpack_require__(127);

var _CheckItem2 = _interopRequireDefault(_CheckItem);

var _Check = __webpack_require__(660);

var _Check2 = _interopRequireDefault(_Check);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Check = function Check(_ref) {
  var title = _ref.title,
      isValid = _ref.isValid,
      msg = _ref.msg,
      children = _ref.children;

  return _react2.default.createElement(
    'div',
    { className: _Check2.default.check },
    _react2.default.createElement(
      'h3',
      null,
      _react2.default.createElement(_CheckItem2.default, { name: title, valid: isValid })
    ),
    _react2.default.createElement(
      'div',
      { className: _Check2.default.content },
      msg ? _react2.default.createElement(
        'div',
        null,
        msg
      ) : null,
      children
    )
  );
};

exports.default = Check;

/***/ }),
/* 80 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var colors = exports.colors = ['#2185D0', '#00B5AD', '#21BA45', '#FBBD08', '#A333C8', '#e03997', '#F2711C', '#DB2828', '#a5673f', '#DDDDDD', '#000000'];

/***/ }),
/* 81 */,
/* 82 */,
/* 83 */,
/* 84 */,
/* 85 */,
/* 86 */,
/* 87 */,
/* 88 */,
/* 89 */,
/* 90 */,
/* 91 */,
/* 92 */,
/* 93 */,
/* 94 */,
/* 95 */,
/* 96 */
/***/ (function(module, exports, __webpack_require__) {

var identity = __webpack_require__(40),
    overRest = __webpack_require__(160),
    setToString = __webpack_require__(161);

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + '');
}

module.exports = baseRest;


/***/ }),
/* 97 */,
/* 98 */,
/* 99 */,
/* 100 */,
/* 101 */,
/* 102 */,
/* 103 */,
/* 104 */,
/* 105 */,
/* 106 */,
/* 107 */,
/* 108 */,
/* 109 */,
/* 110 */,
/* 111 */,
/* 112 */,
/* 113 */,
/* 114 */,
/* 115 */,
/* 116 */,
/* 117 */,
/* 118 */,
/* 119 */,
/* 120 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _AddButton = __webpack_require__(622);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var AddButton = function AddButton(_ref) {
  var text = _ref.text,
      action = _ref.action,
      style = _ref.style;

  return _react2.default.createElement(
    'button',
    { className: _AddButton.add + ' ' + style, onClick: function onClick() {
        return action();
      } },
    _react2.default.createElement('i', { className: 'plus icon' }),
    text
  );
};

exports.default = AddButton;

/***/ }),
/* 121 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Button = __webpack_require__(623);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Button = function Button(_ref) {
  var text = _ref.text,
      action = _ref.action;

  return _react2.default.createElement(
    'button',
    { className: _Button.simpleButton, onClick: function onClick() {
        return action();
      } },
    text
  );
};

exports.default = Button;

/***/ }),
/* 122 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactLeaflet = __webpack_require__(117);

__webpack_require__(651);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MAP = {
  lat: 47,
  lon: 1,
  zoom: 4,
  osmUrl: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  osmAttribution: '&copy; Contributeurs <a href="http://osm.org/copyright">OpenStreetMap</a>'
};

var CenteredMap = function (_Component) {
  _inherits(CenteredMap, _Component);

  function CenteredMap() {
    _classCallCheck(this, CenteredMap);

    return _possibleConstructorReturn(this, (CenteredMap.__proto__ || Object.getPrototypeOf(CenteredMap)).apply(this, arguments));
  }

  _createClass(CenteredMap, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _refs = this.refs,
          vectors = _refs.vectors,
          map = _refs.map;


      if (vectors && map) {
        var bounds = vectors.leafletElement.getBounds();
        map.leafletElement.fitBounds(bounds);
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var zoom = this.props.zoom || MAP.zoom;
      var lat = this.props.lat || MAP.lat;
      var lon = this.props.lon || MAP.lon;

      var _props = this.props,
          vectors = _props.vectors,
          className = _props.className,
          frozen = _props.frozen;


      return _react2.default.createElement(
        _reactLeaflet.Map,
        { ref: 'map', className: className, center: [lat, lon], zoom: zoom, dragging: !frozen, scrollWheelZoom: false, zoomControl: !frozen },
        _react2.default.createElement(_reactLeaflet.TileLayer, { attribution: MAP.osmAttribution, url: MAP.osmUrl }),
        _react2.default.createElement(_reactLeaflet.GeoJSON, { color: 'blue', fillOpacity: 0.1, weight: 2, ref: 'vectors', data: vectors })
      );
    }
  }]);

  return CenteredMap;
}(_react.Component);

exports.default = CenteredMap;

/***/ }),
/* 123 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Chart = __webpack_require__(627);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Chart = function Chart(_ref) {
  var chart = _ref.chart,
      description = _ref.description;

  return _react2.default.createElement(
    'div',
    { className: _Chart.container },
    _react2.default.createElement(
      'h3',
      null,
      description
    ),
    chart
  );
};

exports.default = Chart;

/***/ }),
/* 124 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _moment = __webpack_require__(11);

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var LastHarvestStatus = function LastHarvestStatus(_ref) {
  var harvest = _ref.harvest;

  // Retro-compatibilite, l'API renvoie l'un ou l'autre
  var finishedAt = harvest.finishedAt || harvest.finished;
  var date = new Date(finishedAt).getTime();
  var hoursDifference = (0, _moment2.default)(date).fromNow();
  var status = void 0;

  if (harvest.status === 'successful') {
    status = 'Réussi';
  } else {
    status = 'En échec';
  }

  return _react2.default.createElement(
    'div',
    null,
    status,
    ' ',
    hoursDifference
  );
};

exports.default = LastHarvestStatus;

/***/ }),
/* 125 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Section = __webpack_require__(647);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Section = function Section(_ref) {
  var title = _ref.title,
      children = _ref.children;

  return _react2.default.createElement(
    'div',
    { className: _Section.section },
    _react2.default.createElement(
      'h3',
      null,
      title
    ),
    children
  );
};

exports.default = Section;

/***/ }),
/* 126 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeCancelable = makeCancelable;
exports.acceptNotFound = acceptNotFound;
exports.cancelAll = cancelAll;
function makeCancelable(promise) {
  var hasCanceled_ = false;

  var wrappedPromise = new Promise(function (resolve, reject) {
    promise.then(function (val) {
      return hasCanceled_ ? reject({ isCanceled: true }) : resolve(val);
    }).catch(function (error) {
      return hasCanceled_ ? reject({ isCanceled: true }) : reject(error);
    });
  });

  return {
    promise: wrappedPromise,
    cancel: function cancel() {
      hasCanceled_ = true;
    }
  };
}

function acceptNotFound(promise) {
  return promise.catch(function (err) {
    if (err.message === 'Not found') return;
    throw err;
  });
}

function cancelAll(promises) {
  promises.map(function (promise) {
    return promise.cancel();
  });
}

/***/ }),
/* 127 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CheckItem = function CheckItem(_ref) {
  var name = _ref.name,
      valid = _ref.valid,
      msg = _ref.msg;

  var checkmark = _react2.default.createElement("i", { className: "checkmark green icon" });
  var remove = _react2.default.createElement("i", { className: "remove red icon" });

  return _react2.default.createElement(
    "div",
    null,
    _react2.default.createElement(
      "div",
      null,
      name,
      " ",
      valid ? checkmark : remove
    ),
    msg ? _react2.default.createElement(
      "div",
      null,
      msg
    ) : undefined
  );
};

exports.default = CheckItem;

/***/ }),
/* 128 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _prune = __webpack_require__(702);

var _prune2 = _interopRequireDefault(_prune);

var _MarkdownViewer = __webpack_require__(263);

var _MarkdownViewer2 = _interopRequireDefault(_MarkdownViewer);

var _DatasetDescription = __webpack_require__(664);

var _DatasetDescription2 = _interopRequireDefault(_DatasetDescription);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DatasetDescription = function DatasetDescription(_ref) {
  var description = _ref.description,
      shortDescription = _ref.shortDescription,
      showMore = _ref.showMore;

  if (!description || !description.length) return _react2.default.createElement(
    'div',
    null,
    'Aucune description.'
  );
  var action = description && description.length > 1000 ? _react2.default.createElement(
    'button',
    { className: _DatasetDescription2.default.action, onClick: function onClick() {
        return showMore();
      } },
    shortDescription ? 'Afficher la suite' : 'Réduire'
  ) : null;

  return _react2.default.createElement(
    'div',
    { className: _DatasetDescription2.default.container },
    _react2.default.createElement(_MarkdownViewer2.default, { markdown: shortDescription ? (0, _prune2.default)(description, 1000) : description }),
    action
  );
};

exports.default = DatasetDescription;

/***/ }),
/* 129 */,
/* 130 */,
/* 131 */,
/* 132 */,
/* 133 */,
/* 134 */,
/* 135 */,
/* 136 */,
/* 137 */,
/* 138 */,
/* 139 */,
/* 140 */,
/* 141 */
/***/ (function(module, exports) {

/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} predicate The function invoked per iteration.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 1 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}

module.exports = baseFindIndex;


/***/ }),
/* 142 */,
/* 143 */
/***/ (function(module, exports, __webpack_require__) {

var baseFindIndex = __webpack_require__(141),
    baseIsNaN = __webpack_require__(451),
    strictIndexOf = __webpack_require__(534);

/**
 * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  return value === value
    ? strictIndexOf(array, value, fromIndex)
    : baseFindIndex(array, baseIsNaN, fromIndex);
}

module.exports = baseIndexOf;


/***/ }),
/* 144 */,
/* 145 */,
/* 146 */,
/* 147 */,
/* 148 */,
/* 149 */,
/* 150 */,
/* 151 */,
/* 152 */,
/* 153 */,
/* 154 */,
/* 155 */
/***/ (function(module, exports, __webpack_require__) {

var eq = __webpack_require__(61),
    isArrayLike = __webpack_require__(23),
    isIndex = __webpack_require__(39),
    isObject = __webpack_require__(15);

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq(object[index], value);
  }
  return false;
}

module.exports = isIterateeCall;


/***/ }),
/* 156 */,
/* 157 */,
/* 158 */,
/* 159 */,
/* 160 */,
/* 161 */,
/* 162 */,
/* 163 */
/***/ (function(module, exports, __webpack_require__) {

var createFind = __webpack_require__(490),
    findIndex = __webpack_require__(539);

/**
 * Iterates over elements of `collection`, returning the first element
 * `predicate` returns truthy for. The predicate is invoked with three
 * arguments: (value, index|key, collection).
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to inspect.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @param {number} [fromIndex=0] The index to search from.
 * @returns {*} Returns the matched element, else `undefined`.
 * @example
 *
 * var users = [
 *   { 'user': 'barney',  'age': 36, 'active': true },
 *   { 'user': 'fred',    'age': 40, 'active': false },
 *   { 'user': 'pebbles', 'age': 1,  'active': true }
 * ];
 *
 * _.find(users, function(o) { return o.age < 40; });
 * // => object for 'barney'
 *
 * // The `_.matches` iteratee shorthand.
 * _.find(users, { 'age': 1, 'active': true });
 * // => object for 'pebbles'
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.find(users, ['active', false]);
 * // => object for 'fred'
 *
 * // The `_.property` iteratee shorthand.
 * _.find(users, 'active');
 * // => object for 'barney'
 */
var find = createFind(findIndex);

module.exports = find;


/***/ }),
/* 164 */,
/* 165 */,
/* 166 */,
/* 167 */,
/* 168 */,
/* 169 */
/***/ (function(module, exports, __webpack_require__) {

var baseRest = __webpack_require__(96),
    pullAll = __webpack_require__(548);

/**
 * Removes all given values from `array` using
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * **Note:** Unlike `_.without`, this method mutates `array`. Use `_.remove`
 * to remove elements from an array by predicate.
 *
 * @static
 * @memberOf _
 * @since 2.0.0
 * @category Array
 * @param {Array} array The array to modify.
 * @param {...*} [values] The values to remove.
 * @returns {Array} Returns `array`.
 * @example
 *
 * var array = ['a', 'b', 'c', 'a', 'b', 'c'];
 *
 * _.pull(array, 'a', 'c');
 * console.log(array);
 * // => ['b', 'b']
 */
var pull = baseRest(pullAll);

module.exports = pull;


/***/ }),
/* 170 */
/***/ (function(module, exports, __webpack_require__) {

var baseFlatten = __webpack_require__(94),
    baseOrderBy = __webpack_require__(459),
    baseRest = __webpack_require__(96),
    isIterateeCall = __webpack_require__(155);

/**
 * Creates an array of elements, sorted in ascending order by the results of
 * running each element in a collection thru each iteratee. This method
 * performs a stable sort, that is, it preserves the original sort order of
 * equal elements. The iteratees are invoked with one argument: (value).
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {...(Function|Function[])} [iteratees=[_.identity]]
 *  The iteratees to sort by.
 * @returns {Array} Returns the new sorted array.
 * @example
 *
 * var users = [
 *   { 'user': 'fred',   'age': 48 },
 *   { 'user': 'barney', 'age': 36 },
 *   { 'user': 'fred',   'age': 40 },
 *   { 'user': 'barney', 'age': 34 }
 * ];
 *
 * _.sortBy(users, [function(o) { return o.user; }]);
 * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 40]]
 *
 * _.sortBy(users, ['user', 'age']);
 * // => objects for [['barney', 34], ['barney', 36], ['fred', 40], ['fred', 48]]
 */
var sortBy = baseRest(function(collection, iteratees) {
  if (collection == null) {
    return [];
  }
  var length = iteratees.length;
  if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
    iteratees = [];
  } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
    iteratees = [iteratees[0]];
  }
  return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
});

module.exports = sortBy;


/***/ }),
/* 171 */,
/* 172 */,
/* 173 */,
/* 174 */,
/* 175 */,
/* 176 */,
/* 177 */,
/* 178 */,
/* 179 */,
/* 180 */,
/* 181 */,
/* 182 */,
/* 183 */,
/* 184 */,
/* 185 */,
/* 186 */,
/* 187 */,
/* 188 */,
/* 189 */,
/* 190 */,
/* 191 */,
/* 192 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(397);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetDetail.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetDetail.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 193 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Header = __webpack_require__(216);

var _Header2 = _interopRequireDefault(_Header);

var _Footer = __webpack_require__(215);

var _Footer2 = _interopRequireDefault(_Footer);

var _App = __webpack_require__(621);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var App = function App(_ref) {
  var children = _ref.children;

  return _react2.default.createElement(
    'div',
    { className: _App.content },
    _react2.default.createElement(_Header2.default, null),
    _react2.default.createElement(
      'div',
      { className: _App.body },
      children
    ),
    _react2.default.createElement(_Footer2.default, null)
  );
};

exports.default = App;

/***/ }),
/* 194 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _SearchInput = __webpack_require__(74);

var _SearchInput2 = _interopRequireDefault(_SearchInput);

var _CatalogPreview = __webpack_require__(47);

var _CatalogPreview2 = _interopRequireDefault(_CatalogPreview);

var _Home = __webpack_require__(637);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var catalogsMock = [{
  '_id': '5387761fb01aa2342e124c96',
  'name': 'GrandLyon Smart Data',
  'service': {
    'location': 'https://download.data.grandlyon.com/catalogue/srv/fr/csw',
    'sync': {
      'status': 'successful',
      'finishedAt': '2017-01-23T01:03:24.373Z'
    }
  },
  'metrics': {
    'datasets': {
      'partitions': {
        'download': {
          'not-determined': 31,
          'yes': 409
        },
        'openness': {
          'not-determined': 17,
          'yes': 423
        },
        'dataType': {
          'none': 2,
          'grid': 218,
          'vector': 220
        }
      },
      'totalCount': 440
    },
    'records': {
      'totalCount': 846
    }
  }
}, {
  '_id': '54d5de332eb5568ca8350f3f',
  'name': 'Région Bretagne',
  'service': {
    'location': 'http://applications.region-bretagne.fr/geonetwork/srv/fre/csw',
    'sync': {
      'status': 'successful',
      'finishedAt': '2017-01-23T01:07:06.331Z'
    }
  },
  'metrics': {
    'datasets': {
      'partitions': {
        'download': {
          'not-determined': 11,
          'yes': 79
        },
        'openness': {
          'not-determined': 10,
          'yes': 80
        },
        'dataType': {
          'grid': 1,
          'vector': 89
        }
      },
      'totalCount': 90
    },
    'records': {
      'totalCount': 94
    }
  }
}, {
  '_id': '54f5a39a62781800bf6db9e6',
  'name': 'Adour-Garonne (EauFrance)',
  'service': {
    'location': 'http://catalogue.adour-garonne.eaufrance.fr/catalog/srv/fre/csw-sie-seul',
    'sync': {
      'status': 'successful',
      'finishedAt': '2017-01-23T01:05:21.864Z'
    }
  },
  'metrics': {
    'datasets': {
      'partitions': {
        'download': {
          'not-determined': 9,
          'yes': 64
        },
        'openness': {
          'not-determined': 13,
          'yes': 60
        },
        'dataType': {
          'none': 21,
          'vector': 52
        }
      },
      'totalCount': 73
    },
    'records': {
      'partitions': {
        'metadataType': {
          'Dublin Core': 29,
          'ISO 19139': 75
        },
        'recordType': {
          'service': 2,
          'other': 29,
          'dataset': 73
        }
      },
      'totalCount': 104
    }
  }
}];

var Home = function (_Component) {
  _inherits(Home, _Component);

  function Home(props) {
    _classCallCheck(this, Home);

    var _this = _possibleConstructorReturn(this, (Home.__proto__ || Object.getPrototypeOf(Home)).call(this, props));

    _this.state = { errors: [] };
    return _this;
  }

  _createClass(Home, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      document.title = 'Accueil';
    }
  }, {
    key: 'userSearch',
    value: function userSearch(textInput) {
      _reactRouter.browserHistory.push({ pathname: '/search', query: { q: textInput, availability: 'yes' } });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          { className: _Home.masthead },
          _react2.default.createElement(
            'h1',
            null,
            'Trouvez facilement les donn\xE9es g\xE9ographiques dont vous avez besoin'
          ),
          _react2.default.createElement(_SearchInput2.default, { placeholder: 'Rechercher un jeu de donnée', onSearch: function onSearch(textInput) {
              return _this2.userSearch(textInput);
            }, searchButton: true }),
          _react2.default.createElement(
            _reactRouter.Link,
            { className: _Home.datasetLinks, to: '/search?availability=yes' },
            'Voir tous les jeux de donn\xE9es'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: _Home.datagouv },
          _react2.default.createElement(
            'div',
            { className: _Home.paper },
            _react2.default.createElement(
              'h2',
              null,
              'Les catalogues moissonn\xE9s'
            ),
            _react2.default.createElement(
              'div',
              { className: _Home.catalogs },
              catalogsMock.map(function (catalog, idx) {
                return _react2.default.createElement(_CatalogPreview2.default, { key: idx, catalog: catalog });
              })
            ),
            _react2.default.createElement(
              _reactRouter.Link,
              { className: _Home.catalogLinks, to: 'catalogs' },
              'Voir tous les catalogues'
            ),
            _react2.default.createElement(
              'h2',
              { id: 'evenements' },
              'Nos \xE9v\xE9nements'
            ),
            _react2.default.createElement(
              'div',
              { className: _Home.events },
              _react2.default.createElement(
                _reactRouter.Link,
                { to: 'events' },
                'Voir nos \xE9v\xE9nements'
              )
            )
          )
        )
      );
    }
  }]);

  return Home;
}(_react.Component);

exports.default = Home;

/***/ }),
/* 195 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDocumentTitle = __webpack_require__(10);

var _reactDocumentTitle2 = _interopRequireDefault(_reactDocumentTitle);

var _NotFound = __webpack_require__(639);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NotFound = function NotFound() {
  return _react2.default.createElement(
    _reactDocumentTitle2.default,
    { title: 'Erreur 404' },
    _react2.default.createElement(
      'div',
      { className: _NotFound.notFound },
      _react2.default.createElement(
        'h1',
        null,
        '404'
      ),
      _react2.default.createElement(
        'p',
        null,
        'Page non trouv\xE9e'
      )
    )
  );
};

exports.default = NotFound;

/***/ }),
/* 196 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDocumentTitle = __webpack_require__(10);

var _reactDocumentTitle2 = _interopRequireDefault(_reactDocumentTitle);

var _reactRouter = __webpack_require__(3);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _SearchInput = __webpack_require__(74);

var _SearchInput2 = _interopRequireDefault(_SearchInput);

var _ContentLoader = __webpack_require__(20);

var _ContentLoader2 = _interopRequireDefault(_ContentLoader);

var _Errors = __webpack_require__(13);

var _Errors2 = _interopRequireDefault(_Errors);

var _CatalogSection = __webpack_require__(233);

var _CatalogSection2 = _interopRequireDefault(_CatalogSection);

var _StatisticsSection = __webpack_require__(242);

var _StatisticsSection2 = _interopRequireDefault(_StatisticsSection);

var _OrganizationsSection = __webpack_require__(241);

var _OrganizationsSection2 = _interopRequireDefault(_OrganizationsSection);

var _HarvestsSection = __webpack_require__(236);

var _HarvestsSection2 = _interopRequireDefault(_HarvestsSection);

var _CatalogDetail = __webpack_require__(657);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Import Helpers


// Import Shared Components


// Import Components


// Import CSS


var CatalogDetail = function (_Component) {
  _inherits(CatalogDetail, _Component);

  function CatalogDetail(props) {
    _classCallCheck(this, CatalogDetail);

    var _this = _possibleConstructorReturn(this, (CatalogDetail.__proto__ || Object.getPrototypeOf(CatalogDetail)).call(this, props));

    _this.state = { errors: [] };
    return _this;
  }

  _createClass(CatalogDetail, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return Promise.all([this.updateCatalog(), this.updateMetrics()]);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'updateMetrics',
    value: function updateMetrics() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchMetrics)(this.props.params.catalogId), this, 'metrics');
    }
  }, {
    key: 'updateCatalog',
    value: function updateCatalog() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchCatalog)(this.props.params.catalogId), this, 'catalog');
    }
  }, {
    key: 'userSearch',
    value: function userSearch(textInput) {
      _reactRouter.browserHistory.push({ pathname: '/search', query: { q: textInput, catalog: this.state.catalog.name } });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _state = this.state,
          catalog = _state.catalog,
          metrics = _state.metrics,
          errors = _state.errors;


      if (errors.length) return _react2.default.createElement(_Errors2.default, { errors: errors });

      if (!catalog || !metrics) return _react2.default.createElement(
        'div',
        { className: _CatalogDetail.loader },
        _react2.default.createElement(_ContentLoader2.default, null)
      );

      return _react2.default.createElement(
        _reactDocumentTitle2.default,
        { title: catalog.name },
        _react2.default.createElement(
          'div',
          { className: _CatalogDetail.container },
          _react2.default.createElement(
            'div',
            { className: _CatalogDetail.sectionNoPadding },
            _react2.default.createElement(_CatalogSection2.default, { catalog: catalog }),
            _react2.default.createElement(_StatisticsSection2.default, { metrics: metrics })
          ),
          _react2.default.createElement(
            'div',
            { className: _CatalogDetail.section },
            _react2.default.createElement(_OrganizationsSection2.default, { metrics: metrics, catalog: catalog })
          ),
          _react2.default.createElement(
            'div',
            { className: _CatalogDetail.section },
            _react2.default.createElement(_HarvestsSection2.default, { catalog: catalog })
          ),
          _react2.default.createElement(
            'div',
            { className: _CatalogDetail.section },
            _react2.default.createElement(
              'h2',
              null,
              'Rechercher dans les jeux de donn\xE9es du catalogue'
            ),
            _react2.default.createElement(_SearchInput2.default, { onSearch: function onSearch(textInput) {
                return _this2.userSearch(textInput);
              }, searchButton: true })
          )
        )
      );
    }
  }]);

  return CatalogDetail;
}(_react.Component);

exports.default = CatalogDetail;

/***/ }),
/* 197 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDocumentTitle = __webpack_require__(10);

var _reactDocumentTitle2 = _interopRequireDefault(_reactDocumentTitle);

var _CatalogPreview = __webpack_require__(47);

var _CatalogPreview2 = _interopRequireDefault(_CatalogPreview);

var _ContentLoader = __webpack_require__(20);

var _ContentLoader2 = _interopRequireDefault(_ContentLoader);

var _fetch = __webpack_require__(4);

var _catalogs = __webpack_require__(77);

var _components = __webpack_require__(6);

var _Catalogs = __webpack_require__(658);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Import Shared Components


// Import Helpers


// Import CSS


var Catalogs = function (_Component) {
  _inherits(Catalogs, _Component);

  function Catalogs(props) {
    _classCallCheck(this, Catalogs);

    var _this = _possibleConstructorReturn(this, (Catalogs.__proto__ || Object.getPrototypeOf(Catalogs)).call(this, props));

    _this.state = { errors: [] };
    return _this;
  }

  _createClass(Catalogs, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchCatalogs)(), this, 'catalogs');
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'render',
    value: function render() {
      if (!this.state.catalogs) return _react2.default.createElement(
        'div',
        { className: _Catalogs.loader },
        _react2.default.createElement(_ContentLoader2.default, null)
      );

      var sortedCatalogs = (0, _catalogs.getCatalogOrderByScore)(this.state.catalogs);

      return _react2.default.createElement(
        _reactDocumentTitle2.default,
        { title: 'Catalogues' },
        _react2.default.createElement(
          'div',
          { className: _Catalogs.container },
          sortedCatalogs.map(function (catalog, idx) {
            return _react2.default.createElement(_CatalogPreview2.default, { key: idx, catalog: catalog });
          })
        )
      );
    }
  }]);

  return Catalogs;
}(_react.Component);

exports.default = Catalogs;

/***/ }),
/* 198 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDocumentTitle = __webpack_require__(10);

var _reactDocumentTitle2 = _interopRequireDefault(_reactDocumentTitle);

var _reactRouter = __webpack_require__(3);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _LastHarvestStatus = __webpack_require__(124);

var _LastHarvestStatus2 = _interopRequireDefault(_LastHarvestStatus);

var _HarvestLogs = __webpack_require__(234);

var _HarvestLogs2 = _interopRequireDefault(_HarvestLogs);

var _HarvestResults = __webpack_require__(235);

var _HarvestResults2 = _interopRequireDefault(_HarvestResults);

var _HarvestDetail = __webpack_require__(659);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Import Helpers


// Import Shared Components


// Import Components


// Import CSS


var HarvestDetail = function (_Component) {
  _inherits(HarvestDetail, _Component);

  function HarvestDetail(props) {
    _classCallCheck(this, HarvestDetail);

    var _this = _possibleConstructorReturn(this, (HarvestDetail.__proto__ || Object.getPrototypeOf(HarvestDetail)).call(this, props));

    _this.state = { errors: [] };
    return _this;
  }

  _createClass(HarvestDetail, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return Promise.all([this.updateCatalog(), this.updateHarvest()]);
    }
  }, {
    key: 'updateHarvest',
    value: function updateHarvest() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchHarvest)(this.props.params.catalogId, this.props.params.harvestId), this, 'harvest');
    }
  }, {
    key: 'updateCatalog',
    value: function updateCatalog() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchCatalog)(this.props.params.catalogId), this, 'catalog');
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'render',
    value: function render() {
      var _state = this.state,
          harvest = _state.harvest,
          catalog = _state.catalog;
      var params = this.props.params;


      if (!harvest || !catalog) return null;

      var successful = harvest.status === 'successful';

      return _react2.default.createElement(
        _reactDocumentTitle2.default,
        { title: 'Moissonnage: ' + harvest._id },
        _react2.default.createElement(
          'div',
          { className: _HarvestDetail.container },
          _react2.default.createElement(
            'h1',
            null,
            _react2.default.createElement(
              _reactRouter.Link,
              { to: '/catalogs/' + params.catalogId },
              catalog.name
            )
          ),
          _react2.default.createElement(
            'p',
            null,
            'Identifiant du moissonnage: ',
            harvest._id
          ),
          _react2.default.createElement(_LastHarvestStatus2.default, { harvest: harvest }),
          _react2.default.createElement(
            'div',
            { className: _HarvestDetail.results },
            _react2.default.createElement(
              'h2',
              null,
              successful ? 'Résultats' : 'Logs'
            ),
            successful ? _react2.default.createElement(_HarvestResults2.default, { logs: harvest.log }) : _react2.default.createElement(_HarvestLogs2.default, { logs: harvest.log })
          )
        )
      );
    }
  }]);

  return HarvestDetail;
}(_react.Component);

exports.default = HarvestDetail;

/***/ }),
/* 199 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDocumentTitle = __webpack_require__(10);

var _reactDocumentTitle2 = _interopRequireDefault(_reactDocumentTitle);

var _DatasetDetail = __webpack_require__(270);

var _DatasetDetail2 = _interopRequireDefault(_DatasetDetail);

var _ContentLoader = __webpack_require__(20);

var _ContentLoader2 = _interopRequireDefault(_ContentLoader);

var _Errors = __webpack_require__(13);

var _Errors2 = _interopRequireDefault(_Errors);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _DatasetDetail3 = __webpack_require__(192);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DatasetDetailLoader = function (_Component) {
  _inherits(DatasetDetailLoader, _Component);

  function DatasetDetailLoader(props) {
    _classCallCheck(this, DatasetDetailLoader);

    var _this = _possibleConstructorReturn(this, (DatasetDetailLoader.__proto__ || Object.getPrototypeOf(DatasetDetailLoader)).call(this, props));

    _this.state = { errors: [] };
    return _this;
  }

  _createClass(DatasetDetailLoader, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return Promise.all([this.updateDataset(), this.updateCatalogs(), this.updateDataGouvPublication()]);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'updateDataset',
    value: function updateDataset() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchDataset)(this.props.params.datasetId), this, 'dataset');
    }
  }, {
    key: 'updateCatalogs',
    value: function updateCatalogs() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchCatalogs)(), this, 'catalogs');
    }
  }, {
    key: 'updateDataGouvPublication',
    value: function updateDataGouvPublication() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.getDataGouvPublication)(this.props.params.datasetId), this, 'dataGouvPublication');
    }
  }, {
    key: 'render',
    value: function render() {
      var _state = this.state,
          dataset = _state.dataset,
          catalogs = _state.catalogs,
          dataGouvPublication = _state.dataGouvPublication,
          errors = _state.errors;


      if (errors.length) return _react2.default.createElement(_Errors2.default, { errors: errors });

      if (!dataset || !catalogs) return _react2.default.createElement(
        'div',
        { className: _DatasetDetail3.loader },
        _react2.default.createElement(_ContentLoader2.default, null)
      );

      return _react2.default.createElement(
        _reactDocumentTitle2.default,
        { title: dataset.metadata.title },
        _react2.default.createElement(_DatasetDetail2.default, { dataset: dataset, catalogs: catalogs, dataGouvPublication: dataGouvPublication })
      );
    }
  }]);

  return DatasetDetailLoader;
}(_react.Component);

exports.default = DatasetDetailLoader;

/***/ }),
/* 200 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _forEach2 = __webpack_require__(62);

var _forEach3 = _interopRequireDefault(_forEach2);

var _isArray2 = __webpack_require__(9);

var _isArray3 = _interopRequireDefault(_isArray2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports._extractFilters = _extractFilters;
exports.parseQuery = parseQuery;

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDocumentTitle = __webpack_require__(10);

var _reactDocumentTitle2 = _interopRequireDefault(_reactDocumentTitle);

var _reactRouter = __webpack_require__(3);

var _Datasets = __webpack_require__(252);

var _Datasets2 = _interopRequireDefault(_Datasets);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DISABLED_FILTERS = ['q', 'page', 'offset', 'limit'];

function _extractFilters(query) {
  var filters = [];
  (0, _forEach3.default)(query, function (value, key) {
    if (DISABLED_FILTERS.includes(key)) {
      return;
    }

    if ((0, _isArray3.default)(value)) {
      (0, _forEach3.default)(value, function (current) {
        filters.push({ name: key, value: current });
      });
    } else {
      filters.push({ name: key, value: value });
    }
  });

  return filters;
}

function parseQuery(query) {
  return {
    textInput: query.q,
    page: query.page || 1,
    filters: _extractFilters(query)
  };
}

var WrappedDatasets = function (_Component) {
  _inherits(WrappedDatasets, _Component);

  function WrappedDatasets(props) {
    _classCallCheck(this, WrappedDatasets);

    var _this = _possibleConstructorReturn(this, (WrappedDatasets.__proto__ || Object.getPrototypeOf(WrappedDatasets)).call(this, props));

    _this.state = { query: parseQuery(props.location.query) };
    return _this;
  }

  _createClass(WrappedDatasets, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this2 = this;

      this.handle = _reactRouter.browserHistory.listen(function (location) {
        if (location.pathname === '/search' && location.action === 'POP') {
          _this2.setState({ query: parseQuery(location.query) });
        }
      });
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.handle();
    }
  }, {
    key: 'render',
    value: function render() {
      var query = this.state.query;

      return _react2.default.createElement(
        _reactDocumentTitle2.default,
        { title: 'Recherche jeu de données' },
        _react2.default.createElement(_Datasets2.default, { query: query })
      );
    }
  }]);

  return WrappedDatasets;
}(_react.Component);

exports.default = WrappedDatasets;

/***/ }),
/* 201 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDocumentTitle = __webpack_require__(10);

var _reactDocumentTitle2 = _interopRequireDefault(_reactDocumentTitle);

var _EventbriteWidget = __webpack_require__(211);

var _EventbriteWidget2 = _interopRequireDefault(_EventbriteWidget);

var _PastEvent = __webpack_require__(212);

var _PastEvent2 = _interopRequireDefault(_PastEvent);

var _Events = __webpack_require__(685);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var pastEvents = [{ name: 'Atelier #1', date: '06/10/2016', link: '/assets/ateliers/synthese_atelier_1.pdf' }, { name: 'Atelier #3', date: '09/02/2017', link: '/assets/ateliers/synthese_atelier_3.pdf' }, { name: 'Atelier #4', date: '09/03/2017', link: '/assets/ateliers/synthese_atelier_4.pdf' }];

var Events = function Events() {

  return _react2.default.createElement(
    _reactDocumentTitle2.default,
    { title: 'Événements' },
    _react2.default.createElement(
      'div',
      { className: _Events.events },
      _react2.default.createElement(
        'h1',
        null,
        '\xC9v\xE9nements \xE0 venir'
      ),
      _react2.default.createElement(
        'div',
        { className: _Events.eventsList },
        _react2.default.createElement(_EventbriteWidget2.default, { src: 'https://www.eventbrite.fr/countdown-widget?eid=32256259340' }),
        _react2.default.createElement(_EventbriteWidget2.default, { src: 'https://www.eventbrite.fr/countdown-widget?eid=32842679338' })
      ),
      _react2.default.createElement(
        'h1',
        null,
        '\xC9v\xE9nements pass\xE9s'
      ),
      _react2.default.createElement(
        'div',
        { className: _Events.pastEventsList },
        pastEvents.map(function (event, idx) {
          return _react2.default.createElement(_PastEvent2.default, { key: idx, name: event.name, date: event.date, link: event.link });
        })
      )
    )
  );
};

exports.default = Events;

/***/ }),
/* 202 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _OrganizationHome = __webpack_require__(279);

var _OrganizationHome2 = _interopRequireDefault(_OrganizationHome);

var _fetch = __webpack_require__(4);

var _withResolver = __webpack_require__(231);

var _withResolver2 = _interopRequireDefault(_withResolver);

var _promises = __webpack_require__(126);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Organization = function (_Component) {
  _inherits(Organization, _Component);

  function Organization(props) {
    _classCallCheck(this, Organization);

    var _this = _possibleConstructorReturn(this, (Organization.__proto__ || Object.getPrototypeOf(Organization)).call(this, props));

    _this.state = { dependencies: _this.getDependencies() };
    return _this;
  }

  _createClass(Organization, [{
    key: 'getDependencies',
    value: function getDependencies() {
      var organizationId = this.props.params.organizationId;


      return {
        user: (0, _fetch.getUser)(),
        metrics: (0, _promises.acceptNotFound)((0, _fetch.fetchOrganizationMetrics)(organizationId)),
        organization: (0, _promises.acceptNotFound)((0, _fetch.getOrganization)(organizationId)),
        organizationDetails: (0, _promises.acceptNotFound)((0, _fetch.getOrganizationDetail)(organizationId))
      };
    }
  }, {
    key: 'update',
    value: function update() {
      this.setState({ dependencies: this.getDependencies() });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var OrganizationWithResolver = (0, _withResolver2.default)(_OrganizationHome2.default, this.state.dependencies);
      return _react2.default.createElement(OrganizationWithResolver, { onActivation: function onActivation() {
          return _this2.update();
        } });
    }
  }]);

  return Organization;
}(_react.Component);

exports.default = Organization;

/***/ }),
/* 203 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Layout = __webpack_require__(51);

var _Layout2 = _interopRequireDefault(_Layout);

var _Producers = __webpack_require__(221);

var _Producers2 = _interopRequireDefault(_Producers);

var _Errors = __webpack_require__(13);

var _Errors2 = _interopRequireDefault(_Errors);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PublishingDatasets = function (_Component) {
  _inherits(PublishingDatasets, _Component);

  function PublishingDatasets(props) {
    _classCallCheck(this, PublishingDatasets);

    var _this = _possibleConstructorReturn(this, (PublishingDatasets.__proto__ || Object.getPrototypeOf(PublishingDatasets)).call(this, props));

    var organizationId = props.params.organizationId;

    _this.state = { errors: [], organizationId: organizationId };
    return _this;
  }

  _createClass(PublishingDatasets, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return Promise.all([this.updateUser(), this.updateOrganization()]);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'updateUser',
    value: function updateUser() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.getUser)(), this, 'user');
    }
  }, {
    key: 'updateOrganization',
    value: function updateOrganization() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.getOrganization)(this.props.params.organizationId), this, 'organization');
    }
  }, {
    key: 'render',
    value: function render() {
      var _state = this.state,
          user = _state.user,
          organization = _state.organization,
          errors = _state.errors,
          organizationId = _state.organizationId;


      if (errors.length) {
        return _react2.default.createElement(_Errors2.default, { errors: errors });
      }

      if (!user) {
        return _react2.default.createElement(_Errors2.default, { errors: ['Vous devez être authentifié pour accéder à cette page'] }); // TODO: Vous devez être authentifié
      }

      if (!organization) return null;
      var candidateOrganization = user.organizations.find(function (org) {
        return org.id === organizationId;
      });

      return _react2.default.createElement(
        _Layout2.default,
        { user: user, organization: candidateOrganization, pageTitle: organization.name + ' - Producteurs', title: 'Producteurs' },
        _react2.default.createElement(_Producers2.default, { organization: organization })
      );
    }
  }]);

  return PublishingDatasets;
}(_react.Component);

exports.default = PublishingDatasets;

/***/ }),
/* 204 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Layout = __webpack_require__(51);

var _Layout2 = _interopRequireDefault(_Layout);

var _Organizations = __webpack_require__(283);

var _Organizations2 = _interopRequireDefault(_Organizations);

var _Errors = __webpack_require__(13);

var _Errors2 = _interopRequireDefault(_Errors);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Admin = function (_Component) {
  _inherits(Admin, _Component);

  function Admin(props) {
    _classCallCheck(this, Admin);

    var _this = _possibleConstructorReturn(this, (Admin.__proto__ || Object.getPrototypeOf(Admin)).call(this, props));

    _this.state = {
      user: null,
      errors: []
    };
    return _this;
  }

  _createClass(Admin, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      return (0, _components.waitForDataAndSetState)((0, _fetch.getUser)(), this, 'user').then(function () {
        if (!_this2.state.user) {
          var redirect = encodeURI("https://inspire.data.gouv.fr" + '/publication');
          var logInUrl = 'https://inspire.data.gouv.fr/dgv/login?redirect=' + redirect;

          document.location.replace(logInUrl);
        }
      });
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'render',
    value: function render() {
      var _state = this.state,
          user = _state.user,
          errors = _state.errors;


      if (errors.length) {
        return _react2.default.createElement(_Errors2.default, { errors: errors });
      }

      if (!user) {
        return _react2.default.createElement(_Errors2.default, { errors: ['Vous devez être authentifié pour accéder à cette page'] }); // TODO: Vous devez être authentifié
      }

      return _react2.default.createElement(
        _Layout2.default,
        { user: user, pageTitle: 'Vos organisations', title: 'Vos organisations' },
        _react2.default.createElement(_Organizations2.default, { organizations: user.organizations })
      );
    }
  }]);

  return Admin;
}(_react.Component);

exports.default = Admin;

/***/ }),
/* 205 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Layout = __webpack_require__(51);

var _Layout2 = _interopRequireDefault(_Layout);

var _OrganizationDatasets = __webpack_require__(278);

var _OrganizationDatasets2 = _interopRequireDefault(_OrganizationDatasets);

var _Errors = __webpack_require__(13);

var _Errors2 = _interopRequireDefault(_Errors);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PublishingDatasets = function (_Component) {
  _inherits(PublishingDatasets, _Component);

  function PublishingDatasets(props) {
    _classCallCheck(this, PublishingDatasets);

    var _this = _possibleConstructorReturn(this, (PublishingDatasets.__proto__ || Object.getPrototypeOf(PublishingDatasets)).call(this, props));

    var organizationId = props.params.organizationId;

    _this.state = { errors: [], organizationId: organizationId };
    return _this;
  }

  _createClass(PublishingDatasets, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return Promise.all([this.updateUser(), this.updatePublished(), this.updatePublishedByOthers(), this.updateNotPublishedYet()]);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'updateUser',
    value: function updateUser() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.getUser)(), this, 'user');
    }
  }, {
    key: 'updatePublished',
    value: function updatePublished() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchOrganizationPublished)(this.state.organizationId), this, 'published');
    }
  }, {
    key: 'updateNotPublishedYet',
    value: function updateNotPublishedYet() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchOrganizationNotPublishedYet)(this.state.organizationId), this, 'notPublishedYet');
    }
  }, {
    key: 'updatePublishedByOthers',
    value: function updatePublishedByOthers() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchOrganizationPublishedByOthers)(this.state.organizationId), this, 'publishedByOthers');
    }
  }, {
    key: 'updateDatasets',
    value: function updateDatasets() {
      return Promise.all([this.updatePublished(), this.updateNotPublishedYet()]);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _state = this.state,
          organizationId = _state.organizationId,
          user = _state.user,
          published = _state.published,
          notPublishedYet = _state.notPublishedYet,
          publishedByOthers = _state.publishedByOthers,
          errors = _state.errors;

      var datasets = { published: published, notPublishedYet: notPublishedYet, publishedByOthers: publishedByOthers };

      if (errors.length) {
        return _react2.default.createElement(_Errors2.default, { errors: errors });
      }

      if (!user) {
        return _react2.default.createElement(_Errors2.default, { errors: ['Vous devez être authentifié pour accéder à cette page'] }); // TODO: Vous devez être authentifié
      }

      var candidateOrganization = user.organizations.find(function (organization) {
        return organization.id === organizationId;
      });
      if (!candidateOrganization) return null;

      if (!datasets.published || !datasets.notPublishedYet || !datasets.publishedByOthers) return null;

      return _react2.default.createElement(
        _Layout2.default,
        { user: user, organization: candidateOrganization, pageTitle: candidateOrganization.name, title: 'Jeux de données' },
        _react2.default.createElement(_OrganizationDatasets2.default, Object.assign({}, datasets, { update: function update() {
            return _this2.updateDatasets();
          }, organizationId: organizationId }))
      );
    }
  }]);

  return PublishingDatasets;
}(_react.Component);

exports.default = PublishingDatasets;

/***/ }),
/* 206 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _RemoveButton = __webpack_require__(624);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RemoveButton = function RemoveButton(_ref) {
  var text = _ref.text,
      action = _ref.action,
      style = _ref.style;

  return _react2.default.createElement(
    'button',
    { className: _RemoveButton.remove + ' ' + style, onClick: function onClick() {
        return action();
      } },
    _react2.default.createElement('i', { className: 'trash icon' }),
    text
  );
};

exports.default = RemoveButton;

/***/ }),
/* 207 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _catalogs = __webpack_require__(77);

var _ObsoleteWarning = __webpack_require__(626);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// When testing you may need to define the current date to avoid test cases obsolescence
var ObsoleteWarning = function ObsoleteWarning(_ref) {
  var catalog = _ref.catalog,
      currentDate = _ref.currentDate;

  if (!(0, _catalogs.isObsolete)(catalog, currentDate)) return _react2.default.createElement('span', null);

  return _react2.default.createElement(
    'div',
    { className: _ObsoleteWarning.container },
    _react2.default.createElement('i', { className: 'icon warning' }),
    ' Ce catalogue n\'a pas \xE9t\xE9 mis \xE0 jour depuis plus de 6 mois'
  );
};

exports.default = ObsoleteWarning;

/***/ }),
/* 208 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.formatData = formatData;

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactChartjs = __webpack_require__(69);

var _Percent = __webpack_require__(76);

var _Percent2 = _interopRequireDefault(_Percent);

var _tools = __webpack_require__(80);

var _DoughnutChart = __webpack_require__(628);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function formatData(data) {
  var labels = Object.keys(data).sort(function (a, b) {
    return data[a] < data[b];
  });

  return {
    labels: labels,
    datasets: [{
      data: labels.map(function (label) {
        return data[label];
      }),
      backgroundColor: _tools.colors.slice(0, labels.length)
    }]
  };
}

var DoughnutChart = function DoughnutChart(_ref) {
  var data = _ref.data;

  var formatedData = formatData(data || {});

  if (formatedData.labels.length === 0) {
    return _react2.default.createElement(
      'h1',
      null,
      'Aucune donn\xE9e'
    );
  }

  if (formatedData.labels.length === 1) {
    return _react2.default.createElement(_Percent2.default, { value: 100, total: 100, label: formatedData.labels[0], icon: 'database icon', size: 'large' });
  }

  return _react2.default.createElement(
    'div',
    { className: _DoughnutChart.container },
    _react2.default.createElement(_reactChartjs.Doughnut, { className: 'doughnut computer', data: formatedData, width: 360 })
  );
};

exports.default = DoughnutChart;

/***/ }),
/* 209 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.formatData = formatData;

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactChartjs = __webpack_require__(69);

var _tools = __webpack_require__(80);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function formatData(data) {
  return {
    'labels': Object.keys(data).map(function (item) {
      return item;
    }),
    'datasets': [{
      label: 'Enregistrements',
      lineTension: 0.2,
      backgroundColor: _tools.colors[0],
      data: Object.keys(data).map(function (item) {
        return data[item];
      })
    }]
  };
}

var Histogram = function Histogram(_ref) {
  var data = _ref.data,
      width = _ref.width,
      height = _ref.height;

  var formatedData = formatData(data);
  var options = {
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true
        }
      }]
    }
  };

  return _react2.default.createElement(_reactChartjs.Line, { data: formatedData, width: width, height: height, options: options });
};

exports.default = Histogram;

/***/ }),
/* 210 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _CircularProgress = __webpack_require__(629);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CircularProgress = function CircularProgress(_ref) {
  var style = _ref.style;

  return _react2.default.createElement(
    'div',
    { style: style, className: _CircularProgress.circularProgress },
    'Chargement...'
  );
};

exports.default = CircularProgress;

/***/ }),
/* 211 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
          value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EventbriteWidget = function EventbriteWidget(_ref) {
          var src = _ref.src;

          return _react2.default.createElement("iframe", {
                    src: src,
                    frameBorder: "0",
                    height: "379",
                    width: "195",
                    marginHeight: "0",
                    marginWidth: "0",
                    scrolling: "no" });
};

exports.default = EventbriteWidget;

/***/ }),
/* 212 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Section = __webpack_require__(125);

var _Section2 = _interopRequireDefault(_Section);

var _PastEvent = __webpack_require__(631);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PastEvent = function PastEvent(_ref) {
  var name = _ref.name,
      date = _ref.date,
      link = _ref.link;

  return _react2.default.createElement(
    _Section2.default,
    { title: name },
    _react2.default.createElement(
      'div',
      { className: _PastEvent.event },
      _react2.default.createElement('i', { className: 'huge file text icon' }),
      _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          null,
          date
        ),
        link ? _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'a',
            { href: link },
            'T\xE9l\xE9charger le compte rendu'
          )
        ) : _react2.default.createElement(
          'div',
          null,
          'Bient\xF4t disponible...'
        )
      )
    )
  );
};

exports.default = PastEvent;

/***/ }),
/* 213 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _sortBy2 = __webpack_require__(170);

var _sortBy3 = _interopRequireDefault(_sortBy2);

var _forEach2 = __webpack_require__(62);

var _forEach3 = _interopRequireDefault(_forEach2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _FacetsGroup = __webpack_require__(214);

var _FacetsGroup2 = _interopRequireDefault(_FacetsGroup);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Facets = function (_Component) {
  _inherits(Facets, _Component);

  function Facets() {
    _classCallCheck(this, Facets);

    return _possibleConstructorReturn(this, (Facets.__proto__ || Object.getPrototypeOf(Facets)).apply(this, arguments));
  }

  _createClass(Facets, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          facets = _props.facets,
          filters = _props.filters,
          addFilter = _props.addFilter;

      if (!facets) return _react2.default.createElement('div', null);

      var facetsArray = [];
      (0, _forEach3.default)(facets, function (value, key) {
        var facet = { type: key, value: value };
        facetsArray.push(facet);
      });

      // TODO Sort by most useful facets
      var sorted = (0, _sortBy3.default)(facetsArray, 'type');

      return _react2.default.createElement(
        'div',
        null,
        sorted.map(function (facet) {
          return _react2.default.createElement(_FacetsGroup2.default, {
            key: facet.type,
            type: facet.type,
            facets: facet.value,
            filters: filters,
            addFilter: addFilter });
        })
      );
    }
  }]);

  return Facets;
}(_react.Component);

exports.default = Facets;

/***/ }),
/* 214 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Facet = __webpack_require__(72);

var _Facet2 = _interopRequireDefault(_Facet);

var _manageFilters = __webpack_require__(50);

var _FacetsGroup = __webpack_require__(633);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (_ref) {
  var type = _ref.type,
      facets = _ref.facets,
      filters = _ref.filters,
      addFilter = _ref.addFilter;

  var activeMap = facets.map(function (facet) {
    return (0, _manageFilters.isActive)(filters, { name: type, value: facet.value });
  });

  if (activeMap.indexOf(false) === -1) {
    return null;
  }

  return _react2.default.createElement(
    'div',
    { className: _FacetsGroup.container },
    _react2.default.createElement(
      'h4',
      null,
      (0, _manageFilters.translateFilters)(type)
    ),
    facets.map(function (facet, idx) {
      return _react2.default.createElement(_Facet2.default, {
        key: idx,
        name: type,
        value: facet.value,
        count: facet.count,
        isActive: activeMap[idx],
        addFilter: addFilter });
    })
  );
};

/***/ }),
/* 215 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _NewsletterForm = __webpack_require__(217);

var _NewsletterForm2 = _interopRequireDefault(_NewsletterForm);

var _SocialLinks = __webpack_require__(224);

var _SocialLinks2 = _interopRequireDefault(_SocialLinks);

var _Footer = __webpack_require__(635);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Footer = function (_Component) {
  _inherits(Footer, _Component);

  function Footer() {
    _classCallCheck(this, Footer);

    return _possibleConstructorReturn(this, (Footer.__proto__ || Object.getPrototypeOf(Footer)).apply(this, arguments));
  }

  _createClass(Footer, [{
    key: 'render',
    value: function render() {
      return _react2.default.createElement(
        'footer',
        { className: _Footer.footer },
        _react2.default.createElement('div', { className: _Footer.space }),
        _react2.default.createElement(
          'div',
          { className: _Footer.main },
          _react2.default.createElement(_NewsletterForm2.default, null),
          _react2.default.createElement(
            'div',
            { className: _Footer.info },
            _react2.default.createElement(
              'p',
              null,
              'Fait avec ',
              _react2.default.createElement(
                'span',
                { style: { color: 'white' } },
                '\u2665'
              ),
              ' par ',
              _react2.default.createElement(
                'a',
                { style: { color: 'white' }, href: 'https://beta.gouv.fr' },
                'l\'Incubateur de Services Num\xE9riques'
              )
            ),
            _react2.default.createElement(_SocialLinks2.default, null)
          )
        )
      );
    }
  }]);

  return Footer;
}(_react.Component);

exports.default = Footer;

/***/ }),
/* 216 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _Header = __webpack_require__(636);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Header = function (_Component) {
  _inherits(Header, _Component);

  function Header(props) {
    _classCallCheck(this, Header);

    var _this = _possibleConstructorReturn(this, (Header.__proto__ || Object.getPrototypeOf(Header)).call(this, props));

    _this.state = {
      errors: []
    };
    return _this;
  }

  _createClass(Header, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.getUser)(), this, 'user');
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'render',
    value: function render() {
      var user = this.state.user;

      var loginRedirect = "https://inspire.data.gouv.fr" + '/publication';
      var isPublication = window.location.pathname.startsWith('/publication');
      var logoutRedirect = isPublication ? "https://inspire.data.gouv.fr" : "https://inspire.data.gouv.fr" + window.location.pathname;
      var logInUrl = 'https://inspire.data.gouv.fr/dgv/login?redirect=' + encodeURIComponent(loginRedirect);
      var logoutUrl = 'https://inspire.data.gouv.fr/dgv/logout?redirect=' + encodeURIComponent(logoutRedirect);
      var login = _react2.default.createElement(
        'a',
        { className: _Header.log, href: logInUrl },
        'Publier des donn\xE9es'
      );

      return _react2.default.createElement(
        'nav',
        { className: _Header.nav, role: 'navigation' },
        _react2.default.createElement(
          'a',
          { className: _Header.home, href: '/' },
          'inspire.data.gouv.fr'
        ),
        !user ? login : _react2.default.createElement(
          'div',
          { className: _Header.authentification },
          _react2.default.createElement(
            _reactRouter.Link,
            { to: '/publication' },
            _react2.default.createElement(
              'div',
              { className: _Header.account },
              _react2.default.createElement('img', { alt: 'avatar', className: _Header.avatar, src: user.avatar }),
              user.first_name + ' ' + user.last_name
            )
          ),
          _react2.default.createElement(
            'a',
            { className: _Header.log, href: logoutUrl },
            _react2.default.createElement(
              'span',
              { className: _Header.logout },
              'D\xE9connexion'
            ),
            _react2.default.createElement('i', { className: 'power icon' })
          )
        )
      );
    }
  }]);

  return Header;
}(_react.Component);

exports.default = Header;

/***/ }),
/* 217 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _NewsletterForm = __webpack_require__(638);

var _NewsletterForm2 = _interopRequireDefault(_NewsletterForm);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NewsletterForm = function (_Component) {
  _inherits(NewsletterForm, _Component);

  function NewsletterForm(props) {
    _classCallCheck(this, NewsletterForm);

    var _this = _possibleConstructorReturn(this, (NewsletterForm.__proto__ || Object.getPrototypeOf(NewsletterForm)).call(this, props));

    _this.state = {
      user: null,
      value: '',
      errors: []
    };
    return _this;
  }

  _createClass(NewsletterForm, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this2 = this;

      return (0, _components.waitForDataAndSetState)((0, _fetch.getUser)(), this, 'user').then(function () {
        if (!_this2.state.user) return;
        _this2.setState({ value: _this2.state.user.email });
      });
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'handleChange',
    value: function handleChange(event) {
      this.setState({ value: event.target.value });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var value = this.state.value;


      return _react2.default.createElement(
        'div',
        { id: 'mc_embed_signup', className: _NewsletterForm2.default.container },
        _react2.default.createElement(
          'form',
          { action: '//gouv.us15.list-manage.com/subscribe/post?u=f4e80584578b65fde5aadffb6&id=a9e2a3104d', method: 'post', id: 'mc-embedded-subscribe-form', name: 'mc-embedded-subscribe-form', className: 'validate', target: '_blank', noValidate: true },
          _react2.default.createElement(
            'div',
            { id: 'mc_embed_signup_scroll' },
            _react2.default.createElement(
              'h2',
              { className: _NewsletterForm2.default.title },
              'Inscrivez-vous pour recevoir nos communications :'
            ),
            _react2.default.createElement(
              'div',
              { className: _NewsletterForm2.default.form },
              _react2.default.createElement(
                'label',
                { htmlFor: 'mce-EMAIL' },
                'Votre adresse email '
              ),
              _react2.default.createElement('input', { className: _NewsletterForm2.default.input, type: 'email', value: value, onChange: function onChange(e) {
                  return _this3.handleChange(e);
                }, name: 'EMAIL', id: 'mce-EMAIL' }),
              _react2.default.createElement('input', { type: 'submit', value: 'S\'inscrire', name: 'subscribe', id: 'mc-embedded-subscribe', className: _NewsletterForm2.default.button })
            ),
            _react2.default.createElement(
              'div',
              { style: { position: 'absolute', left: '-5000px' }, 'aria-hidden': 'true' },
              _react2.default.createElement('input', { type: 'text', name: 'b_f4e80584578b65fde5aadffb6_a9e2a3104d', tabIndex: '-1', value: '' })
            )
          )
        )
      );
    }
  }]);

  return NewsletterForm;
}(_react.Component);

exports.default = NewsletterForm;

/***/ }),
/* 218 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
               value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactPaginate = __webpack_require__(118);

var _reactPaginate2 = _interopRequireDefault(_reactPaginate);

var _Pagination = __webpack_require__(640);

var _Pagination2 = _interopRequireDefault(_Pagination);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var WrappedPagination = function WrappedPagination(_ref) {
               var max = _ref.max,
                   page = _ref.page,
                   handleChangePage = _ref.handleChangePage;

               var selected = Number(page - 1) || 0;
               return _react2.default.createElement(_reactPaginate2.default, { previousLabel: 'Précédent',
                              nextLabel: 'Suivant',
                              breakLabel: '...',
                              pageCount: max,
                              forcePage: selected,
                              initialPage: selected,
                              marginPagesDisplayed: 2,
                              pageRangeDisplayed: 5,
                              onPageChange: handleChangePage,
                              breakClassName: _Pagination2.default.paginationElementBreak,
                              containerClassName: _Pagination2.default.pagination,
                              pageClassName: _Pagination2.default.paginationElement,
                              pageLinkClassName: _Pagination2.default.paginationElementLink,
                              previousClassName: _Pagination2.default.paginationElement,
                              previousLinkClassName: _Pagination2.default.paginationElementLink,
                              nextClassName: _Pagination2.default.paginationElement,
                              nextLinkClassName: _Pagination2.default.paginationElementLink,
                              activeClassName: _Pagination2.default.paginationElementActive });
};

exports.default = WrappedPagination;

/***/ }),
/* 219 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _OtherProducersItem = __webpack_require__(220);

var _OtherProducersItem2 = _interopRequireDefault(_OtherProducersItem);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _OtherProducers = __webpack_require__(641);

var _OtherProducers2 = _interopRequireDefault(_OtherProducers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var OtherProducers = function (_Component) {
  _inherits(OtherProducers, _Component);

  function OtherProducers(props) {
    _classCallCheck(this, OtherProducers);

    var _this = _possibleConstructorReturn(this, (OtherProducers.__proto__ || Object.getPrototypeOf(OtherProducers)).call(this, props));

    _this.state = {
      errors: [],
      organizationProducers: []
    };
    return _this;
  }

  _createClass(OtherProducers, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var producers = this.props.producers;

      var organizationsId = producers.map(function (producer) {
        return producer.associatedTo;
      });
      return (0, _components.waitForDataAndSetState)((0, _fetch.getOrganizations)(organizationsId), this, 'organizations');
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'render',
    value: function render() {
      var organizations = this.state.organizations;
      var producers = this.props.producers;


      if (!organizations) return null;

      return _react2.default.createElement(
        'div',
        { className: _OtherProducers2.default.container },
        _react2.default.createElement(
          'div',
          { className: _OtherProducers2.default.header },
          _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(
              'div',
              null,
              'Producteurs rattach\xE9s \xE0 d\'autres organisations'
            ),
            _react2.default.createElement(
              'div',
              { className: _OtherProducers2.default.subtitle },
              _react2.default.createElement(
                'div',
                null,
                'Les producteurs de cette liste ne peuvent pas \xEAtre rattach\xE9s \xE0 votre compte organisation parce qu\'ils sont d\xE9j\xE0 rattach\xE9s \xE0 un autre compte. N\\\'h\xE9sitez pas \xE0 contacter l\'organisation de rattachement si vous estimez que votre propre compte est plus pertinent.'
              ),
              _react2.default.createElement(
                'p',
                null,
                'En cas de difficult\xE9, contactez ',
                _react2.default.createElement(
                  'a',
                  { href: 'mailto:inspire@data.gouv.fr' },
                  'notre \xE9quipe'
                ),
                '.'
              )
            )
          ),
          _react2.default.createElement(
            'div',
            null,
            producers.length
          )
        ),
        _react2.default.createElement(
          'div',
          { className: _OtherProducers2.default.list },
          producers.map(function (producer, idx) {
            return _react2.default.createElement(
              'div',
              { className: _OtherProducers2.default.producers, key: idx },
              _react2.default.createElement(
                'div',
                null,
                producer._id
              ),
              _react2.default.createElement(_OtherProducersItem2.default, { organizations: organizations, producer: producer })
            );
          })
        )
      );
    }
  }]);

  return OtherProducers;
}(_react.Component);

exports.default = OtherProducers;

/***/ }),
/* 220 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _find2 = __webpack_require__(163);

var _find3 = _interopRequireDefault(_find2);

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _OtherProducersItem = __webpack_require__(642);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var OtherProducersItem = function OtherProducersItem(_ref) {
  var organizations = _ref.organizations,
      producer = _ref.producer;

  var organization = (0, _find3.default)(organizations, function (organization) {
    return organization._id === producer.associatedTo;
  });
  return _react2.default.createElement(
    'div',
    { className: _OtherProducersItem.item },
    'Rattach\xE9 \xE0 ',
    _react2.default.createElement(
      'a',
      { href: 'https://www.data.gouv.fr/fr/organizations/' + organization._id + '/' },
      organization.name
    )
  );
};

exports.default = OtherProducersItem;

/***/ }),
/* 221 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pull2 = __webpack_require__(169);

var _pull3 = _interopRequireDefault(_pull2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _Errors = __webpack_require__(13);

var _Errors2 = _interopRequireDefault(_Errors);

var _RelatedProducers = __webpack_require__(222);

var _RelatedProducers2 = _interopRequireDefault(_RelatedProducers);

var _UnrelatedProducers = __webpack_require__(223);

var _UnrelatedProducers2 = _interopRequireDefault(_UnrelatedProducers);

var _OtherProducers = __webpack_require__(219);

var _OtherProducers2 = _interopRequireDefault(_OtherProducers);

var _producers = __webpack_require__(227);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _Producers = __webpack_require__(643);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Producers = function (_Component) {
  _inherits(Producers, _Component);

  function Producers(props) {
    _classCallCheck(this, Producers);

    var _this = _possibleConstructorReturn(this, (Producers.__proto__ || Object.getPrototypeOf(Producers)).call(this, props));

    _this.state = {
      errors: [],
      organizationProducers: []
    };
    return _this;
  }

  _createClass(Producers, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      return Promise.all([this.updateProducersToAssociate()]);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'updateProducersToAssociate',
    value: function updateProducersToAssociate() {
      var organization = this.props.organization;

      return (0, _components.waitForDataAndSetState)((0, _fetch.getOrganizationProducers)(organization._id), this, 'organizationProducers');
    }
  }, {
    key: 'dissociate',
    value: function dissociate(producer) {
      var _this2 = this;

      var organizationProducers = this.state.organizationProducers;
      var organization = this.props.organization;


      this.setState({ organizationProducers: (0, _pull3.default)([].concat(_toConsumableArray(organizationProducers)), producer) });

      (0, _fetch.dissociateProducer)(producer._id, organization._id).then(function () {
        return _this2.updateProducersToAssociate();
      });
    }
  }, {
    key: 'associate',
    value: function associate(producer) {
      var _this3 = this;

      var organizationProducers = this.state.organizationProducers;
      var organization = this.props.organization;


      this.setState({ organizationProducers: (0, _pull3.default)([].concat(_toConsumableArray(organizationProducers)), producer) });

      (0, _fetch.associateProducer)(producer._id, organization._id).then(function () {
        return _this3.updateProducersToAssociate();
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this4 = this;

      var _state = this.state,
          organizationProducers = _state.organizationProducers,
          errors = _state.errors;
      var organization = this.props.organization;

      var related = (0, _producers.getRelated)(organizationProducers, organization._id);
      var unrelatedProducers = (0, _producers.getUnrelated)(organizationProducers);
      var relateToOther = (0, _producers.getRelatedToOther)(organizationProducers, organization._id);

      if (errors.length) return _react2.default.createElement(_Errors2.default, { errors: errors });
      if (!organizationProducers.length) return null;

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(_RelatedProducers2.default, { producers: related, action: function action(producer) {
            return _this4.dissociate(producer);
          } }),
        _react2.default.createElement(_UnrelatedProducers2.default, { producers: unrelatedProducers, action: function action(producer) {
            return _this4.associate(producer);
          } }),
        _react2.default.createElement(_OtherProducers2.default, { producers: relateToOther }),
        _react2.default.createElement(
          'div',
          { className: _Producers.previousPage },
          _react2.default.createElement(
            _reactRouter.Link,
            { to: '/publication/' + organization._id },
            _react2.default.createElement('i', { className: 'arrow left icon' }),
            ' Retour'
          )
        )
      );
    }
  }]);

  return Producers;
}(_react.Component);

exports.default = Producers;

/***/ }),
/* 222 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _RelatedProducers = __webpack_require__(644);

var _RelatedProducers2 = _interopRequireDefault(_RelatedProducers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RelatedProducers = function RelatedProducers(_ref) {
  var producers = _ref.producers,
      action = _ref.action;


  return _react2.default.createElement(
    'div',
    { className: _RelatedProducers2.default.container },
    _react2.default.createElement(
      'div',
      { className: _RelatedProducers2.default.header },
      _react2.default.createElement(
        'div',
        null,
        'Producteurs rattach\xE9s \xE0 votre organisation'
      ),
      _react2.default.createElement(
        'div',
        null,
        producers.length
      )
    ),
    _react2.default.createElement(
      'div',
      { className: _RelatedProducers2.default.list },
      producers.map(function (producer, idx) {
        return _react2.default.createElement(
          'div',
          { className: _RelatedProducers2.default.producers, key: idx },
          _react2.default.createElement(
            'div',
            null,
            producer._id
          ),
          _react2.default.createElement(
            'button',
            { className: _RelatedProducers2.default.dissociate, onClick: function onClick() {
                return action(producer);
              } },
            'Dissocier'
          )
        );
      })
    )
  );
};

exports.default = RelatedProducers;

/***/ }),
/* 223 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _UnrelatedProducers = __webpack_require__(645);

var _UnrelatedProducers2 = _interopRequireDefault(_UnrelatedProducers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var UnrelatedProducers = function UnrelatedProducers(_ref) {
  var producers = _ref.producers,
      action = _ref.action;


  return _react2.default.createElement(
    'div',
    { className: _UnrelatedProducers2.default.container },
    _react2.default.createElement(
      'div',
      { className: _UnrelatedProducers2.default.header },
      _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          null,
          'Producteurs non rattach\xE9s'
        ),
        _react2.default.createElement(
          'div',
          { className: _UnrelatedProducers2.default.subtitle },
          'Ajoutez les producteurs dont vous souhaitez que les donn\xE9es ouvertes soient publi\xE9es dans votre organisation.'
        )
      ),
      _react2.default.createElement(
        'div',
        null,
        producers.length
      )
    ),
    _react2.default.createElement(
      'div',
      { className: _UnrelatedProducers2.default.list },
      producers.map(function (producer, idx) {
        return _react2.default.createElement(
          'div',
          { className: _UnrelatedProducers2.default.producers, key: idx },
          _react2.default.createElement(
            'div',
            null,
            producer._id
          ),
          _react2.default.createElement(
            'button',
            { className: _UnrelatedProducers2.default.associate, onClick: function onClick() {
                return action(producer);
              } },
            'Associer'
          )
        );
      })
    )
  );
};

exports.default = UnrelatedProducers;

/***/ }),
/* 224 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _SocialLinks = __webpack_require__(648);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SocialLinks = function SocialLinks() {
  return _react2.default.createElement(
    'div',
    { className: _SocialLinks.container },
    _react2.default.createElement(
      'a',
      { className: _SocialLinks.link, href: 'https://twitter.com/inspire_dgfr' },
      _react2.default.createElement(
        'svg',
        { className: _SocialLinks.twitter, xmlns: 'https://www.w3.org/2000/svg', width: '22', height: '19', viewBox: '0 0 22 19' },
        _react2.default.createElement('path', { fill: '#CBD2E4', fillRule: 'evenodd', d: 'M22,3.24925943 C21.1916416,3.63076945 20.3213005,3.88876855 19.4083464,4.00404488 C20.3406702,3.41119547 21.0560542,2.47114483 21.3930855,1.35131808 C20.5201622,1.90025278 19.5555557,2.29960285 18.5250927,2.51368725 C17.7038212,1.58187072 16.5300227,1 15.230968,1 C12.7400364,1 10.7191407,3.1477068 10.7191407,5.7963163 C10.7191407,6.17233675 10.7578799,6.53737805 10.8353584,6.88869613 C7.08411092,6.68833495 3.75899517,4.7807872 1.53149012,1.87555088 C1.14280696,2.58642115 0.920701833,3.41119547 0.920701833,4.2894909 C0.920701833,5.95276278 1.71743871,7.42116305 2.92868446,8.28161795 C2.19005692,8.25828833 1.49275088,8.04008663 0.883254167,7.68327898 L0.883254167,7.74228965 C0.883254167,10.067028 2.43927933,12.0061395 4.50537083,12.445287 C4.12701758,12.5578187 3.72800358,12.6140844 3.31607696,12.6140844 C3.02553258,12.6140844 2.74144521,12.5852657 2.46639663,12.5289996 C3.04102838,14.4338027 4.70681475,15.821235 6.68251467,15.8582883 C5.138111,17.1455398 3.19081996,17.9126762 1.07694996,17.9126762 C0.712801375,17.9126762 0.352526625,17.8907188 0,17.8468041 C1.99765225,19.2054171 4.37107458,20 6.91882354,20 C15.2219288,20 19.7608735,12.6923079 19.7608735,6.35348513 C19.7608735,6.14488982 19.7569996,5.93629453 19.7492515,5.73181652 C20.6312145,5.05525455 21.3969594,4.21126742 22,3.24925943', transform: 'translate(0 -1)' })
      )
    ),
    _react2.default.createElement(
      'a',
      { className: _SocialLinks.link, href: 'https://medium.com/inspire-data-gouv-fr' },
      _react2.default.createElement(
        'svg',
        { className: _SocialLinks.medium, xmlns: 'https://www.w3.org/2000/svg', width: '20', height: '17', viewBox: '0 0 20 17' },
        _react2.default.createElement('path', { fill: '#CBD2E4', fillRule: 'evenodd', d: 'M300.938846,3.11053784 C300.935024,3.10746703 300.931966,3.10343659 300.927189,3.10113349 L300.920309,3.09767883 L294.887095,0.0681335801 C294.846389,0.0475975431 294.803581,0.0337789018 294.7602,0.0226472181 C294.705735,0.00863665101 294.650123,0 294.59432,0 C294.363273,0 294.133373,0.116498826 294.008772,0.319556087 L290.535421,5.98826994 L294.894357,13.1017996 L300.957383,3.20726833 C300.977449,3.17425713 300.967894,3.13356891 300.938846,3.11053784 Z M288.62226,4.69699467 L288.62226,11.1497245 L294.33327,14.0174765 L288.62226,4.69699467 Z M295.191335,14.4483494 L299.89235,16.8088421 C300.50408,17.116115 301,16.9009664 301,16.3286443 L301,4.96876129 L295.191335,14.4483494 Z M287.630802,3.11975027 L281.738433,0.160833634 C281.631987,0.107478324 281.530701,0.0821441474 281.43897,0.0821441474 C281.180977,0.0821441474 281,0.282706376 281,0.619151913 L281,13.3956376 C281,13.737649 281.249202,14.142612 281.553825,14.2955767 L286.743689,16.9015422 C286.876698,16.9683323 287.003402,17 287.117874,17 C287.440461,17 287.66673,16.7493452 287.66673,16.3286443 L287.66673,3.17790372 C287.66673,3.15333725 287.65278,3.13069003 287.630802,3.11975027 Z', transform: 'translate(-281)' })
      )
    )
  );
};

exports.default = SocialLinks;

/***/ }),
/* 225 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _User = __webpack_require__(650);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var User = function User(_ref) {
  var user = _ref.user;

  var avatar = user.avatar ? { url: user.avatar, alt: user.slug } : { url: 'assets/avatar.png', alt: 'no avatar' };

  return _react2.default.createElement(
    'div',
    { className: _User.section },
    _react2.default.createElement(
      _reactRouter.Link,
      { className: _User.detail, to: '/publication' },
      _react2.default.createElement('img', { className: _User.img, src: avatar.url, alt: avatar.alt }),
      _react2.default.createElement(
        'div',
        null,
        user.first_name,
        ' ',
        user.last_name
      )
    )
  );
};

exports.default = User;

/***/ }),
/* 226 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var frequencies = exports.frequencies = {
  continual: 'en continu',
  daily: 'quotidienne',
  weekly: 'hebdomadaire',
  fortnightly: 'bimensuelle',
  monthly: 'mensuelle',
  quarterly: 'trimestrielle',
  biannually: 'semestrielle',
  annually: 'annuelle',
  asNeeded: 'ponctuelle',
  irregular: 'irrégulière',
  notPlanned: 'non planifiée',
  unknown: 'inconnue'
};

/***/ }),
/* 227 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRelated = getRelated;
exports.getUnrelated = getUnrelated;
exports.getRelatedToOther = getRelatedToOther;
function getRelated(producers, organizationId) {
  return producers.filter(function (producer) {
    return producer.associatedTo && producer.associatedTo === organizationId;
  });
}

function getUnrelated(producers) {
  return producers.filter(function (producer) {
    return !producer.associatedTo;
  });
}

function getRelatedToOther(producers, organizationId) {
  return producers.filter(function (producer) {
    return producer.associatedTo && producer.associatedTo !== organizationId;
  });
}

/***/ }),
/* 228 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.roleTradTable = exports.tagsColors = undefined;
exports.translateRole = translateRole;

var _tools = __webpack_require__(80);

var tagsColors = exports.tagsColors = {
  processor: _tools.colors[0],
  resourceProvider: _tools.colors[0],
  publisher: _tools.colors[1],
  owner: _tools.colors[2],
  author: _tools.colors[3],
  custodian: _tools.colors[4],
  user: _tools.colors[5],
  distributor: _tools.colors[6],
  originator: _tools.colors[7],
  pointOfContact: _tools.colors[8],
  notDefined: _tools.colors[9],
  other: _tools.colors[9]
};

var roleTradTable = exports.roleTradTable = {
  resourceProvider: 'Fournisseur',
  custodian: 'Responsable',
  owner: 'Propriétaire',
  user: 'Utilisateur',
  distributor: 'Distributeur',
  originator: 'Initiateur',
  pointOfContact: 'Point de contact',
  processor: 'Intervenant technique',
  publisher: 'Diffuseur',
  author: 'Auteur',
  notDefined: 'Inconnu',
  other: 'Autre'
};

function translateRole(role) {
  return roleTradTable[role] || role;
}

/***/ }),
/* 229 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._fetch = _fetch;
exports._get = _get;
exports._put = _put;
exports._post = _post;
exports._delete = _delete;
function _fetch(url, method, data) {
  var options = {
    headers: {
      'Accept': 'application/json'
    },
    mode: 'cors',
    method: method || 'GET'
  };

  if (url.includes('https://inspire.data.gouv.fr/dgv/api')) {
    options.credentials = 'include';
  }

  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }

  return fetch(url, options).then(function (response) {
    if (response.status === 500) throw new Error('Internal Server Error');
    if (response.status === 401) throw new Error('Unauthorized');
    if (response.status === 404) throw new Error('Not found');
    if (response.status === 202) return;
    if (response.status === 204) return;
    return response.json();
  }).catch(function (err) {
    throw err;
  });
}

function _get(url) {
  return _fetch(url);
}

function _put(url, data) {
  return _fetch(url, 'PUT', data);
}

function _post(url, data) {
  return _fetch(url, 'POST', data);
}

function _delete(url) {
  return _fetch(url, 'DELETE');
}

/***/ }),
/* 230 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var topicCategories = exports.topicCategories = {
  farming: 'agriculture',
  biota: 'biote',
  boundaries: 'limites',
  climatologyMeteorologyAtmosphere: 'climatologie, météorologie, athmosphère',
  economy: 'économie',
  elevation: 'altitude',
  environment: 'environnement',
  geoscientificInformation: 'informations géoscientifiques',
  health: 'santé',
  imageryBaseMapsEarthCover: 'imagerie, fonds de cartes, occupation des sols',
  intelligenceMilitary: 'infrastructures militaires',
  inlandWaters: 'eaux intérieures',
  location: 'localisation',
  oceans: 'océans',
  planningCadastre: 'cadastre, planification',
  society: 'société',
  structure: 'structure',
  transportation: 'transport',
  utilitiesCommunication: 'services d\'utilité publique, communication'
};

/***/ }),
/* 231 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = withResolver;

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _components = __webpack_require__(6);

var _Errors = __webpack_require__(13);

var _Errors2 = _interopRequireDefault(_Errors);

var _ContentLoader = __webpack_require__(20);

var _ContentLoader2 = _interopRequireDefault(_ContentLoader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function withResolver(WrappedComponent, dependencies) {
  return function (_Component) {
    _inherits(ComponentWithResolver, _Component);

    function ComponentWithResolver(props) {
      _classCallCheck(this, ComponentWithResolver);

      var _this = _possibleConstructorReturn(this, (ComponentWithResolver.__proto__ || Object.getPrototypeOf(ComponentWithResolver)).call(this, props));

      _this.state = { errors: [] };
      return _this;
    }

    _createClass(ComponentWithResolver, [{
      key: 'componentDidMount',
      value: function componentDidMount() {
        var _this2 = this;

        var dependenciesPromise = Promise.all(Object.keys(dependencies).map(function (dependencyName) {
          return (0, _components.waitForDataAndSetState)(dependencies[dependencyName], _this2, dependencyName);
        }));

        dependenciesPromise.then(function () {
          return _this2.setState({ dependenciesReady: true });
        });

        return dependenciesPromise;
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        return (0, _components.cancelAllPromises)(this);
      }
    }, {
      key: 'render',
      value: function render() {
        var _state = this.state,
            errors = _state.errors,
            dependenciesReady = _state.dependenciesReady;


        if (errors.length) {
          return _react2.default.createElement(_Errors2.default, { errors: errors });
        }

        if (!dependenciesReady) {
          return _react2.default.createElement(_ContentLoader2.default, null);
        }

        return _react2.default.createElement(WrappedComponent, Object.assign({}, this.state, this.props));
      }
    }]);

    return ComponentWithResolver;
  }(_react.Component);
}

/***/ }),
/* 232 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDom = __webpack_require__(0);

var _reactDom2 = _interopRequireDefault(_reactDom);

var _reactRouter = __webpack_require__(3);

var _reactRouterScroll = __webpack_require__(71);

var _moment = __webpack_require__(11);

var _moment2 = _interopRequireDefault(_moment);

var _piwikReactRouter = __webpack_require__(70);

var _piwikReactRouter2 = _interopRequireDefault(_piwikReactRouter);

var _App = __webpack_require__(193);

var _App2 = _interopRequireDefault(_App);

var _Home = __webpack_require__(194);

var _Home2 = _interopRequireDefault(_Home);

var _NotFound = __webpack_require__(195);

var _NotFound2 = _interopRequireDefault(_NotFound);

var _Catalogs = __webpack_require__(197);

var _Catalogs2 = _interopRequireDefault(_Catalogs);

var _CatalogDetail = __webpack_require__(196);

var _CatalogDetail2 = _interopRequireDefault(_CatalogDetail);

var _HarvestDetail = __webpack_require__(198);

var _HarvestDetail2 = _interopRequireDefault(_HarvestDetail);

var _Publication = __webpack_require__(204);

var _Publication2 = _interopRequireDefault(_Publication);

var _Organization = __webpack_require__(202);

var _Organization2 = _interopRequireDefault(_Organization);

var _PublishingDatasets = __webpack_require__(205);

var _PublishingDatasets2 = _interopRequireDefault(_PublishingDatasets);

var _OrganizationProducers = __webpack_require__(203);

var _OrganizationProducers2 = _interopRequireDefault(_OrganizationProducers);

var _Events = __webpack_require__(201);

var _Events2 = _interopRequireDefault(_Events);

var _WrappedDatasets = __webpack_require__(200);

var _WrappedDatasets2 = _interopRequireDefault(_WrappedDatasets);

var _DatasetDetailLoader = __webpack_require__(199);

var _DatasetDetailLoader2 = _interopRequireDefault(_DatasetDetailLoader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_moment2.default.locale('fr');

// Piwik
(0, _piwikReactRouter2.default)({
  url: 'https://stats.data.gouv.fr',
  siteId: 32
}).connectToHistory(_reactRouter.browserHistory);
_reactDom2.default.render(_react2.default.createElement(
  _reactRouter.Router,
  { history: _reactRouter.browserHistory, render: (0, _reactRouter.applyRouterMiddleware)((0, _reactRouterScroll.useScroll)()) },
  _react2.default.createElement(
    _reactRouter.Route,
    { path: '/', component: _App2.default },
    _react2.default.createElement(_reactRouter.IndexRoute, { component: _Home2.default }),
    _react2.default.createElement(_reactRouter.Route, { path: '/events', component: _Events2.default }),
    _react2.default.createElement(_reactRouter.Route, { path: '/publication', component: _Publication2.default }),
    _react2.default.createElement(_reactRouter.Route, { path: '/publication/:organizationId', component: _Organization2.default }),
    _react2.default.createElement(_reactRouter.Route, { path: '/publication/:organizationId/datasets', component: _PublishingDatasets2.default }),
    _react2.default.createElement(_reactRouter.Route, { path: '/publication/:organizationId/producers', component: _OrganizationProducers2.default }),
    _react2.default.createElement(_reactRouter.Route, { path: '/catalogs', component: _Catalogs2.default }),
    _react2.default.createElement(_reactRouter.Route, { path: '/catalogs/:catalogId', component: _CatalogDetail2.default }),
    _react2.default.createElement(_reactRouter.Route, { path: '/catalogs/:catalogId/harvest/:harvestId', component: _HarvestDetail2.default }),
    _react2.default.createElement(_reactRouter.Route, { path: '/search', component: _WrappedDatasets2.default }),
    _react2.default.createElement(_reactRouter.Redirect, { from: '/datasets', to: '/search' }),
    _react2.default.createElement(_reactRouter.Route, { path: '/datasets/:datasetId', component: _DatasetDetailLoader2.default }),
    _react2.default.createElement(_reactRouter.Route, { path: '*', component: _NotFound2.default })
  )
), document.getElementById('root'));

/***/ }),
/* 233 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _CatalogSection = __webpack_require__(652);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CatalogSection = function CatalogSection(_ref) {
  var catalog = _ref.catalog;

  return _react2.default.createElement(
    'div',
    { className: _CatalogSection.container },
    _react2.default.createElement(
      'h1',
      null,
      catalog.name
    ),
    _react2.default.createElement(
      'a',
      { href: catalog.service.location },
      'Acc\xE8s direct au service du catalogue'
    )
  );
};

exports.default = CatalogSection;

/***/ }),
/* 234 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var HarvestLogs = function HarvestLogs(_ref) {
  var logs = _ref.logs;

  return _react2.default.createElement(
    'div',
    null,
    logs.map(function (log, idx) {
      return _react2.default.createElement(
        'pre',
        { key: idx },
        _react2.default.createElement(
          'code',
          null,
          log
        )
      );
    })
  );
};

exports.default = HarvestLogs;

/***/ }),
/* 235 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var HarvestResults = function HarvestResults(_ref) {
  var logs = _ref.logs;

  return _react2.default.createElement(
    'ul',
    null,
    logs.map(function (log, idx) {
      return _react2.default.createElement(
        'li',
        { key: idx },
        log.split(':')[0],
        ': ',
        _react2.default.createElement(
          'strong',
          null,
          log.split(':')[1]
        )
      );
    })
  );
};

exports.default = HarvestResults;

/***/ }),
/* 236 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _HarvestsTable = __webpack_require__(240);

var _HarvestsTable2 = _interopRequireDefault(_HarvestsTable);

var _Histogram = __webpack_require__(209);

var _Histogram2 = _interopRequireDefault(_Histogram);

var _Chart = __webpack_require__(123);

var _Chart2 = _interopRequireDefault(_Chart);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _HarvestsSection = __webpack_require__(653);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HarvestsSection = function (_Component) {
  _inherits(HarvestsSection, _Component);

  function HarvestsSection(props) {
    _classCallCheck(this, HarvestsSection);

    var _this = _possibleConstructorReturn(this, (HarvestsSection.__proto__ || Object.getPrototypeOf(HarvestsSection)).call(this, props));

    _this.state = {
      isPending: _this.props.catalog.service.sync.pending,
      errors: []
    };
    return _this;
  }

  _createClass(HarvestsSection, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchHarvests)(this.props.catalog._id), this, 'harvests');
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'sync',
    value: function sync() {
      this.setState({ isPending: true });
      (0, _fetch.syncCatalog)(this.props.catalog._id);
    }
  }, {
    key: 'getGraphData',
    value: function getGraphData() {
      var reorderedHarvests = [].concat(_toConsumableArray(this.state.harvests)).reverse();
      var data = [];
      reorderedHarvests.forEach(function (harvest) {
        if (harvest.status === 'successful') {
          var date = new Date(harvest.finished).toLocaleDateString().split('-').reverse().join('/');
          data[date] = harvest.itemsFound;
        }
      });
      return data;
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var harvests = this.state.harvests;


      if (!harvests) return null;

      var isPending = this.state.isPending;
      var catalog = this.props.catalog;


      var dataGraph = this.getGraphData();
      var histogram = _react2.default.createElement(_Histogram2.default, { data: dataGraph, width: 400, height: 220 });

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'h2',
          null,
          'Moissonnage du catalogue'
        ),
        _react2.default.createElement(
          'div',
          { className: _HarvestsSection.harvest },
          _react2.default.createElement(
            'div',
            { className: _HarvestsSection.stats },
            _react2.default.createElement(_HarvestsTable2.default, { harvests: harvests, catalog: catalog, pending: isPending }),
            _react2.default.createElement(
              'div',
              { className: _HarvestsSection.chart },
              _react2.default.createElement(_Chart2.default, {
                title: 'Évolution des Enregistrements',
                description: 'Évolution du nombre d\'enregistrements par moissonnage',
                chart: histogram })
            )
          ),
          isPending ? _react2.default.createElement(
            'div',
            { className: _HarvestsSection.pending },
            'Synchronisation en cours ...'
          ) : _react2.default.createElement(
            'button',
            { onClick: function onClick() {
                return _this2.sync();
              } },
            'Synchroniser'
          )
        )
      );
    }
  }]);

  return HarvestsSection;
}(_react.Component);

exports.default = HarvestsSection;

/***/ }),
/* 237 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var HarvestDelta = function HarvestDelta(_ref) {
  var delta = _ref.delta;

  if (delta > 0) return _react2.default.createElement(
    "div",
    null,
    _react2.default.createElement("i", { className: "long green arrow up icon" }),
    "+",
    delta
  );
  if (delta < 0) return _react2.default.createElement(
    "div",
    null,
    _react2.default.createElement("i", { className: "long red arrow down icon" }),
    delta
  );
  return _react2.default.createElement("div", null);
};

exports.default = HarvestDelta;

/***/ }),
/* 238 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _HarvestDelta = __webpack_require__(237);

var _HarvestDelta2 = _interopRequireDefault(_HarvestDelta);

var _doneSince = __webpack_require__(49);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var displayStyle = {
  successful: {
    color: 'green'
  },
  failed: {
    color: 'red'
  }
};

var HarvestRow = function HarvestRow(_ref) {
  var harvest = _ref.harvest,
      catalog = _ref.catalog,
      previousHarvest = _ref.previousHarvest;

  return _react2.default.createElement(
    'tr',
    null,
    _react2.default.createElement(
      'td',
      null,
      _react2.default.createElement(
        'div',
        { style: displayStyle[harvest.status] },
        harvest.status === 'successful' ? 'Réussi' : 'En échec'
      )
    ),
    _react2.default.createElement(
      'td',
      null,
      harvest.itemsFound
    ),
    _react2.default.createElement(
      'td',
      null,
      _react2.default.createElement(_HarvestDelta2.default, { delta: harvest.itemsFound - previousHarvest.itemsFound })
    ),
    _react2.default.createElement(
      'td',
      null,
      (0, _doneSince.doneSince)(harvest.finished)
    ),
    _react2.default.createElement(
      'td',
      null,
      _react2.default.createElement(
        _reactRouter.Link,
        { to: '/catalogs/' + catalog._id + '/harvest/' + harvest._id },
        'D\xE9tails'
      )
    )
  );
};

exports.default = HarvestRow;

/***/ }),
/* 239 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var HarvestRowPending = function HarvestRowPending() {
  return _react2.default.createElement(
    "tr",
    null,
    _react2.default.createElement(
      "td",
      { colSpan: "5" },
      "En cours..."
    )
  );
};

exports.default = HarvestRowPending;

/***/ }),
/* 240 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _HarvestRow = __webpack_require__(238);

var _HarvestRow2 = _interopRequireDefault(_HarvestRow);

var _HarvestRowPending = __webpack_require__(239);

var _HarvestRowPending2 = _interopRequireDefault(_HarvestRowPending);

var _HarvestsTable = __webpack_require__(654);

var _HarvestsTable2 = _interopRequireDefault(_HarvestsTable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var HarvestsTable = function HarvestsTable(_ref) {
  var harvests = _ref.harvests,
      catalog = _ref.catalog,
      _ref$pending = _ref.pending,
      pending = _ref$pending === undefined ? false : _ref$pending;

  return _react2.default.createElement(
    'table',
    { className: _HarvestsTable2.default.table },
    _react2.default.createElement(
      'thead',
      null,
      _react2.default.createElement(
        'tr',
        null,
        _react2.default.createElement(
          'th',
          null,
          'Statut'
        ),
        _react2.default.createElement(
          'th',
          null,
          'Enregistrements'
        ),
        _react2.default.createElement(
          'th',
          null,
          'Delta'
        ),
        _react2.default.createElement(
          'th',
          null,
          'Date'
        ),
        _react2.default.createElement('th', null)
      )
    ),
    _react2.default.createElement(
      'tbody',
      null,
      pending ? _react2.default.createElement(_HarvestRowPending2.default, null) : null,
      harvests.map(function (harvest, idx) {
        return _react2.default.createElement(_HarvestRow2.default, { key: idx, harvest: harvest, previousHarvest: harvests[idx + 1] || 0, catalog: catalog });
      })
    )
  );
};

exports.default = HarvestsTable;

/***/ }),
/* 241 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _Facet = __webpack_require__(72);

var _Facet2 = _interopRequireDefault(_Facet);

var _OrganizationsSection = __webpack_require__(655);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var OrganizationsSection = function OrganizationsSection(_ref) {
  var metrics = _ref.metrics,
      catalog = _ref.catalog;
  var _metrics$records$coun = metrics.records.counts,
      organizations = _metrics$records$coun.organizations,
      keywords = _metrics$records$coun.keywords;


  var goToSearch = function goToSearch(filter) {
    return function () {
      return _reactRouter.browserHistory.push({ pathname: '/search', query: Object.assign({}, filter, { catalog: catalog.name }) });
    };
  };
  var sections = [{ name: 'organization', title: 'Organisations', filters: organizations }, { name: 'keyword', title: 'Mots-clés', filters: keywords }];

  return _react2.default.createElement(
    'div',
    null,
    sections.map(function (section) {
      return _react2.default.createElement(
        'div',
        { key: section.title, className: _OrganizationsSection.group },
        _react2.default.createElement(
          'h2',
          null,
          section.title
        ),
        _react2.default.createElement(
          'div',
          { className: _OrganizationsSection.facets },
          Object.keys(section.filters).map(function (filter, idx) {
            return _react2.default.createElement(_Facet2.default, { style: { margin: '2px 5px' }, key: idx, name: section.title, value: filter, addFilter: goToSearch(_defineProperty({}, section.name, filter)), count: section.filters[filter] });
          })
        )
      );
    })
  );
};

exports.default = OrganizationsSection;

/***/ }),
/* 242 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get2 = __webpack_require__(63);

var _get3 = _interopRequireDefault(_get2);

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Chart = __webpack_require__(123);

var _Chart2 = _interopRequireDefault(_Chart);

var _DoughnutChart = __webpack_require__(208);

var _DoughnutChart2 = _interopRequireDefault(_DoughnutChart);

var _Counter = __webpack_require__(75);

var _Counter2 = _interopRequireDefault(_Counter);

var _Percent = __webpack_require__(76);

var _Percent2 = _interopRequireDefault(_Percent);

var _StatisticsSection = __webpack_require__(656);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var StatisticsSection = function StatisticsSection(_ref) {
  var metrics = _ref.metrics;

  var openness = (0, _get3.default)(metrics, 'datasets.partitions.openness.yes', 0);
  var download = (0, _get3.default)(metrics, 'datasets.partitions.download.yes', 0);

  return _react2.default.createElement(
    'div',
    { className: _StatisticsSection.container },
    _react2.default.createElement(
      'h2',
      null,
      'Indicateurs concernant la totalit\xE9 du catalogue'
    ),
    _react2.default.createElement(
      'div',
      { className: _StatisticsSection.section },
      _react2.default.createElement(
        'div',
        { className: _StatisticsSection.chart },
        _react2.default.createElement(_Counter2.default, { size: 'large', value: metrics.records.totalCount, title: 'Enregistrements' })
      ),
      _react2.default.createElement(
        'div',
        { className: _StatisticsSection.chart },
        _react2.default.createElement(_Chart2.default, {
          description: 'Répartition des types d\'enregistrements',
          chart: _react2.default.createElement(_DoughnutChart2.default, { data: metrics.records.partitions.recordType }) })
      ),
      _react2.default.createElement(
        'div',
        { className: _StatisticsSection.chart },
        _react2.default.createElement(_Chart2.default, {
          description: 'Répartition des types de meta donnée',
          chart: _react2.default.createElement(_DoughnutChart2.default, { data: metrics.records.partitions.metadataType }) })
      )
    ),
    _react2.default.createElement(
      'h2',
      null,
      'Indicateurs concernant les jeux de donn\xE9es'
    ),
    _react2.default.createElement(
      'div',
      { className: _StatisticsSection.section },
      _react2.default.createElement(
        'div',
        { className: _StatisticsSection.chart },
        _react2.default.createElement(_Percent2.default, { value: openness, total: metrics.datasets.totalCount, size: 'large', icon: 'unlock alternate icon', title: 'Pourcentage de donn\xE9es ouvertes' })
      ),
      _react2.default.createElement(
        'div',
        { className: _StatisticsSection.chart },
        _react2.default.createElement(_Percent2.default, { value: download, total: metrics.datasets.totalCount, size: 'large', icon: 'download', title: 'Pourcentage de jeu de donn\xE9es t\xE9l\xE9chargeable' })
      ),
      _react2.default.createElement(
        'div',
        { className: _StatisticsSection.chart },
        _react2.default.createElement(_Chart2.default, {
          description: 'Répartition des types de donnée',
          chart: _react2.default.createElement(_DoughnutChart2.default, { data: metrics.datasets.partitions.dataType }) })
      )
    )
  );
};

exports.default = StatisticsSection;

/***/ }),
/* 243 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Check = __webpack_require__(79);

var _Check2 = _interopRequireDefault(_Check);

var _CheckItem = __webpack_require__(127);

var _CheckItem2 = _interopRequireDefault(_CheckItem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DatasetDataAvailability = function DatasetDataAvailability(_ref) {
  var valid = _ref.valid,
      distributions = _ref.distributions;

  var content = null;
  var msg = valid ? 'Au moins une des distribution est disponible.' : 'Aucune distribution n\'a été trouvée.';

  if (valid) {
    content = distributions.map(function (distribution, idx) {
      var name = distribution.typeName || distribution.layer || distribution.name;
      return _react2.default.createElement(_CheckItem2.default, { key: idx, name: name, valid: distribution.available });
    });
  }

  return _react2.default.createElement(
    _Check2.default,
    { title: 'Disponibilit\xE9 de la donn\xE9e', isValid: valid, msg: msg },
    content
  );
};

exports.default = DatasetDataAvailability;

/***/ }),
/* 244 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Check = __webpack_require__(79);

var _Check2 = _interopRequireDefault(_Check);

var _dataGouvChecks = __webpack_require__(48);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CheckLicense = function (_Component) {
  _inherits(CheckLicense, _Component);

  function CheckLicense() {
    _classCallCheck(this, CheckLicense);

    return _possibleConstructorReturn(this, (CheckLicense.__proto__ || Object.getPrototypeOf(CheckLicense)).apply(this, arguments));
  }

  _createClass(CheckLicense, [{
    key: 'check',
    value: function check() {
      var license = this.props.license;

      var msg = '';
      var content = _react2.default.createElement(
        'div',
        null,
        'Les licenses reconnue sont :',
        _react2.default.createElement(
          'ul',
          null,
          Object.keys(_dataGouvChecks.ACCEPTED_LICENSES).map(function (licence, idx) {
            var li = _dataGouvChecks.ACCEPTED_LICENSES[licence];
            return _react2.default.createElement(
              'li',
              { key: idx },
              _react2.default.createElement(
                'a',
                { href: li.link },
                li.name
              )
            );
          })
        )
      );

      if (!license) {
        msg = 'Aucune licence n\'a pu être trouvée.';
      } else if (_dataGouvChecks.ACCEPTED_LICENSES[license]) {
        msg = 'La licence ' + _dataGouvChecks.ACCEPTED_LICENSES[license].name + ' est valide.';
        content = undefined;
      } else {
        msg = 'La licence ' + license + ' n\'est pas reconnue.';
      }

      return { msg: msg, content: content };
    }
  }, {
    key: 'render',
    value: function render() {
      var valid = this.props.valid;

      var _check = this.check(),
          msg = _check.msg,
          content = _check.content;

      return _react2.default.createElement(
        _Check2.default,
        { title: 'Licence', isValid: valid, msg: msg },
        content
      );
    }
  }]);

  return CheckLicense;
}(_react.Component);

exports.default = CheckLicense;

/***/ }),
/* 245 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Check = __webpack_require__(79);

var _Check2 = _interopRequireDefault(_Check);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CheckProducers = function CheckProducers(_ref) {
  var valid = _ref.valid,
      organizations = _ref.organizations;

  var msg = valid ? 'Au moins un producteur est identifié.' : 'Le producteur n\'a pas été identifié.';

  return _react2.default.createElement(
    _Check2.default,
    { title: 'Producteur', isValid: valid, msg: msg },
    organizations ? organizations : null
  );
};

exports.default = CheckProducers;

/***/ }),
/* 246 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _roles = __webpack_require__(228);

var _Contact = __webpack_require__(661);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Contact = function Contact(_ref) {
  var contact = _ref.contact;

  var unknown = 'Non renseigné';
  var address = contact.address ? contact.address[0] + ' ' + contact.town + ' - ' + contact.postalCode + ' ' + contact.country : null;

  if (!contact) return _react2.default.createElement(
    'div',
    null,
    unknown
  );

  return _react2.default.createElement(
    'div',
    { className: _Contact.container },
    _react2.default.createElement(
      'div',
      { className: _Contact.name },
      _react2.default.createElement(
        'div',
        null,
        contact.organizationName ? contact.organizationName : unknown
      ),
      _react2.default.createElement(
        'div',
        { className: _Contact.tag, style: { backgroundColor: _roles.tagsColors[contact.role] } },
        (0, _roles.translateRole)(contact.role)
      )
    ),
    _react2.default.createElement(
      'div',
      null,
      address
    ),
    _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement('i', { className: 'call icon' }),
      contact.phoneNumber ? contact.phoneNumber : unknown
    ),
    _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement('i', { className: 'mail outline icon' }),
      contact.email ? _react2.default.createElement(
        'a',
        { href: 'mailto:' + contact.email },
        contact.email
      ) : unknown
    )
  );
};

exports.default = Contact;

/***/ }),
/* 247 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Contact = __webpack_require__(246);

var _Contact2 = _interopRequireDefault(_Contact);

var _Contacts = __webpack_require__(662);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Contacts = function Contacts(_ref) {
  var contacts = _ref.contacts;

  if (!contacts || !contacts.length) return _react2.default.createElement(
    'div',
    null,
    'Aucun contact'
  );

  return _react2.default.createElement(
    'div',
    null,
    contacts.map(function (contact, idx) {
      return _react2.default.createElement(
        'div',
        { key: idx },
        _react2.default.createElement(_Contact2.default, { contact: contact }),
        contacts[idx + 1] ? _react2.default.createElement('div', { className: _Contacts.divider }) : null
      );
    })
  );
};

exports.default = Contacts;

/***/ }),
/* 248 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _CheckLicense = __webpack_require__(244);

var _CheckLicense2 = _interopRequireDefault(_CheckLicense);

var _CheckProducers = __webpack_require__(245);

var _CheckProducers2 = _interopRequireDefault(_CheckProducers);

var _CheckDataAvailability = __webpack_require__(243);

var _CheckDataAvailability2 = _interopRequireDefault(_CheckDataAvailability);

var _Button = __webpack_require__(121);

var _Button2 = _interopRequireDefault(_Button);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _DatasetChecklist = __webpack_require__(663);

var _dataGouvChecks = __webpack_require__(48);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DatasetChecklist = function (_Component) {
  _inherits(DatasetChecklist, _Component);

  function DatasetChecklist(props) {
    _classCallCheck(this, DatasetChecklist);

    var _this = _possibleConstructorReturn(this, (DatasetChecklist.__proto__ || Object.getPrototypeOf(DatasetChecklist)).call(this, props));

    _this.state = { showDetails: false };
    return _this;
  }

  _createClass(DatasetChecklist, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.getDataGouvPublication)(this.props.dataset.recordId), this, 'dataGouvPublication');
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'handleDetails',
    value: function handleDetails() {
      this.setState({ showDetails: !this.state.showDetails });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _state = this.state,
          showDetails = _state.showDetails,
          dataGouvPublication = _state.dataGouvPublication;
      var _props$dataset = this.props.dataset,
          metadata = _props$dataset.metadata,
          organizations = _props$dataset.organizations,
          dataset = _props$dataset.dataset;

      var licenseCheck = (0, _dataGouvChecks.checkLicense)(metadata.license);
      var producersCheck = (0, _dataGouvChecks.checkProducers)(organizations);
      var dataAvailabilityCheck = (0, _dataGouvChecks.checkDataAvailability)(dataset.distributions);

      if (licenseCheck && producersCheck && dataAvailabilityCheck) {
        if (dataGouvPublication) {
          return _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(
              'a',
              { href: dataGouvPublication.remoteUrl },
              'Consulter le jeu de donn\xE9es sur data.gouv.fr'
            )
          );
        } else {
          return _react2.default.createElement(
            'div',
            null,
            'Ce jeu de donn\xE9es ',
            _react2.default.createElement(
              'b',
              null,
              'peut'
            ),
            ' \xEAtre publi\xE9 sur data.gouv.fr',
            _react2.default.createElement(
              'div',
              { className: _DatasetChecklist.highlight },
              'Une action du producteur est n\xE9cessaire.'
            )
          );
        }
      } else {
        return _react2.default.createElement(
          'div',
          { className: _DatasetChecklist.checklist },
          'Ce jeu de donn\xE9es ',
          _react2.default.createElement(
            'b',
            null,
            'ne peut pas'
          ),
          ' \xEAtre publi\xE9 sur data.gouv.fr',
          showDetails ? _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(_CheckLicense2.default, { license: metadata.license, valid: licenseCheck }),
            _react2.default.createElement(_CheckProducers2.default, { organizations: organizations, valid: producersCheck }),
            _react2.default.createElement(_CheckDataAvailability2.default, { distributions: dataset.distributions, valid: dataAvailabilityCheck })
          ) : null,
          _react2.default.createElement(_Button2.default, { text: (showDetails ? 'Masquer' : 'Afficher') + ' le d\xE9tail', action: function action() {
              return _this2.handleDetails();
            } })
        );
      }
    }
  }]);

  return DatasetChecklist;
}(_react.Component);

exports.default = DatasetChecklist;

/***/ }),
/* 249 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _DatasetDescription = __webpack_require__(128);

var _DatasetDescription2 = _interopRequireDefault(_DatasetDescription);

var _Filter = __webpack_require__(73);

var _Filter2 = _interopRequireDefault(_Filter);

var _DatasetPreview = __webpack_require__(665);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DatasetPreview = function (_Component) {
  _inherits(DatasetPreview, _Component);

  function DatasetPreview(props) {
    _classCallCheck(this, DatasetPreview);

    var _this = _possibleConstructorReturn(this, (DatasetPreview.__proto__ || Object.getPrototypeOf(DatasetPreview)).call(this, props));

    _this.state = { shortDescription: true };
    return _this;
  }

  _createClass(DatasetPreview, [{
    key: 'onClick',
    value: function onClick(value) {
      this.props.onClick(value);
    }
  }, {
    key: 'wrapDescription',
    value: function wrapDescription() {
      this.setState({ shortDescription: !this.state.shortDescription });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props$dataset = this.props.dataset,
          metadata = _props$dataset.metadata,
          organizations = _props$dataset.organizations,
          recordId = _props$dataset.recordId;
      var addFilter = this.props.addFilter;


      return _react2.default.createElement(
        'div',
        { className: _DatasetPreview.container },
        _react2.default.createElement(
          'h4',
          null,
          _react2.default.createElement(
            _reactRouter.Link,
            { to: '/datasets/' + recordId },
            metadata.title
          )
        ),
        _react2.default.createElement(_DatasetDescription2.default, { description: metadata.description, shortDescription: this.state.shortDescription, showMore: function showMore() {
            return _this2.wrapDescription();
          } }),
        _react2.default.createElement(
          'h5',
          null,
          'Mot-cl\xE9'
        ),
        _react2.default.createElement(
          'div',
          { className: _DatasetPreview.list },
          metadata.keywords.map(function (keyword, idx) {
            return _react2.default.createElement(_Filter2.default, { onClick: addFilter, key: idx, filter: { value: keyword, name: 'keyword' } });
          })
        ),
        _react2.default.createElement(
          'h5',
          null,
          'Organisation'
        ),
        _react2.default.createElement(
          'div',
          { className: _DatasetPreview.list },
          organizations.map(function (organization, idx) {
            return _react2.default.createElement(_Filter2.default, { onClick: addFilter, key: idx, filter: { value: organization, name: 'organization' } });
          })
        )
      );
    }
  }]);

  return DatasetPreview;
}(_react.Component);

exports.default = DatasetPreview;

/***/ }),
/* 250 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _DatasetDescription = __webpack_require__(128);

var _DatasetDescription2 = _interopRequireDefault(_DatasetDescription);

var _Button = __webpack_require__(121);

var _Button2 = _interopRequireDefault(_Button);

var _doneSince = __webpack_require__(49);

var _status = __webpack_require__(78);

var _dataGouvChecks = __webpack_require__(48);

var _DatasetSection = __webpack_require__(666);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DatasetSection = function (_Component) {
  _inherits(DatasetSection, _Component);

  function DatasetSection(props) {
    _classCallCheck(this, DatasetSection);

    var _this = _possibleConstructorReturn(this, (DatasetSection.__proto__ || Object.getPrototypeOf(DatasetSection)).call(this, props));

    _this.state = { shortDescription: true };
    return _this;
  }

  _createClass(DatasetSection, [{
    key: 'wrapDescription',
    value: function wrapDescription() {
      this.setState({ shortDescription: !this.state.shortDescription });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          dataset = _props.dataset,
          warning = _props.warning,
          hideStatusWarning = _props.hideStatusWarning;
      var shortDescription = this.state.shortDescription;
      var _dataset$metadata = dataset.metadata,
          title = _dataset$metadata.title,
          description = _dataset$metadata.description,
          status = _dataset$metadata.status,
          type = _dataset$metadata.type,
          purpose = _dataset$metadata.purpose,
          lineage = _dataset$metadata.lineage,
          inspireTheme = _dataset$metadata.inspireTheme;

      var revisionDate = (0, _doneSince.doneSince)(dataset.revisionDate);
      var completStatus = _status.statusTranslate[status];
      var license = (0, _dataGouvChecks.getLicense)(dataset.metadata.license);

      return _react2.default.createElement(
        'div',
        { className: _DatasetSection.container },
        _react2.default.createElement(
          'div',
          { className: inspireTheme ? _DatasetSection.inspireThemeHead : _DatasetSection.head },
          _react2.default.createElement(
            'div',
            { className: _DatasetSection.resume },
            _react2.default.createElement(
              'h1',
              null,
              title
            ),
            _react2.default.createElement(
              'div',
              { className: _DatasetSection.infos },
              _react2.default.createElement(
                'div',
                null,
                'Type : ',
                _react2.default.createElement(
                  'span',
                  null,
                  type || 'inconnu'
                )
              ),
              _react2.default.createElement(
                'div',
                null,
                'Licence : ',
                _react2.default.createElement(
                  'span',
                  null,
                  license.name ? _react2.default.createElement(
                    'a',
                    { href: license.link },
                    license.name
                  ) : license
                )
              ),
              _react2.default.createElement(
                'div',
                null,
                'Derni\xE8re mise \xE0 jour : ',
                _react2.default.createElement(
                  'span',
                  null,
                  revisionDate
                )
              )
            )
          ),
          inspireTheme ? _react2.default.createElement(
            'div',
            { className: _DatasetSection.theme },
            _react2.default.createElement(
              'div',
              null,
              _react2.default.createElement('img', { src: '/assets/inspire-icons/' + inspireTheme.id + '.svg', alt: 'inspire-theme-icon' })
            ),
            _react2.default.createElement(
              'div',
              null,
              _react2.default.createElement(
                'a',
                { href: inspireTheme.uri },
                inspireTheme.label.fr
              )
            )
          ) : null
        ),
        _react2.default.createElement(
          'div',
          { className: _DatasetSection.section },
          warning ? _react2.default.createElement(
            'div',
            { className: _DatasetSection.stat },
            _react2.default.createElement(
              'h2',
              null,
              'Attention !'
            ),
            _react2.default.createElement(
              'h3',
              null,
              'Cette fiche de donn\xE9es est ',
              completStatus.status,
              '.'
            ),
            _react2.default.createElement(
              'div',
              null,
              completStatus.consequences
            ),
            _react2.default.createElement(_Button2.default, { text: 'Afficher tout de m\xEAme', action: function action() {
                return hideStatusWarning();
              } })
          ) : _react2.default.createElement(
            'div',
            null,
            _react2.default.createElement(_DatasetDescription2.default, {
              description: description,
              shortDescription: shortDescription,
              showMore: function showMore() {
                return _this2.wrapDescription();
              } }),
            _react2.default.createElement(
              'p',
              null,
              _react2.default.createElement(
                'b',
                null,
                'Objectif : '
              ),
              purpose ? purpose : 'Non renseigné'
            ),
            _react2.default.createElement(
              'p',
              null,
              _react2.default.createElement(
                'b',
                null,
                'Origine de la donn\xE9e : '
              ),
              lineage ? lineage : 'Non renseignée'
            )
          )
        )
      );
    }
  }]);

  return DatasetSection;
}(_react.Component);

exports.default = DatasetSection;

/***/ }),
/* 251 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactable = __webpack_require__(119);

var _DatasetTable = __webpack_require__(667);

var _DatasetTable2 = _interopRequireDefault(_DatasetTable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DatasetTable = function (_Component) {
  _inherits(DatasetTable, _Component);

  function DatasetTable() {
    _classCallCheck(this, DatasetTable);

    return _possibleConstructorReturn(this, (DatasetTable.__proto__ || Object.getPrototypeOf(DatasetTable)).apply(this, arguments));
  }

  _createClass(DatasetTable, [{
    key: 'render',
    value: function render() {
      var geojson = this.props.geojson;

      var noDataText = 'Chargement...';
      var data = [];

      if (geojson) {
        if (!geojson.features || !geojson.features.length) {
          noDataText = 'Les données sont vides';
        } else {
          data = geojson.features.map(function (feature) {
            delete feature.properties.gml_id;

            return feature.properties;
          });
        }
      }

      return _react2.default.createElement(_reactable.Table, {
        className: _DatasetTable2.default.table,
        data: data,
        sortable: true,
        itemsPerPage: 20,
        pageButtonLimit: 20,
        noDataText: noDataText });
    }
  }]);

  return DatasetTable;
}(_react.Component);

exports.default = DatasetTable;

/***/ }),
/* 252 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.buildSearchQuery = buildSearchQuery;

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _qs = __webpack_require__(68);

var _qs2 = _interopRequireDefault(_qs);

var _DatasetsResults = __webpack_require__(253);

var _DatasetsResults2 = _interopRequireDefault(_DatasetsResults);

var _SearchInput = __webpack_require__(74);

var _SearchInput2 = _interopRequireDefault(_SearchInput);

var _Filter = __webpack_require__(73);

var _Filter2 = _interopRequireDefault(_Filter);

var _fetch = __webpack_require__(4);

var _manageFilters = __webpack_require__(50);

var _components = __webpack_require__(6);

var _Datasets = __webpack_require__(668);

var _Datasets2 = _interopRequireDefault(_Datasets);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function buildSearchQuery(q, filters, page) {
  var qsFilters = (0, _manageFilters.convertFilters)(filters);
  var qPart = q && q.length ? { q: q } : {};
  var pagePart = page && page > 1 ? { page: page } : {};
  return _qs2.default.stringify(Object.assign({}, qPart, pagePart, qsFilters), { indices: false });
}

var Datasets = function (_Component) {
  _inherits(Datasets, _Component);

  function Datasets(props) {
    _classCallCheck(this, Datasets);

    var _this = _possibleConstructorReturn(this, (Datasets.__proto__ || Object.getPrototypeOf(Datasets)).call(this, props));

    _this.state = Object.assign({
      errors: []
    }, props.query);
    return _this;
  }

  _createClass(Datasets, [{
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if (!nextProps.query || this.props.query === nextProps.query) return;
      this.search(nextProps.query, false);
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      return this.fetchRecords();
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'fetchRecords',
    value: function fetchRecords() {
      var _state = this.state,
          textInput = _state.textInput,
          filters = _state.filters,
          _state$page = _state.page,
          page = _state$page === undefined ? 1 : _state$page;

      var allFilters = filters;
      var offset = (page - 1) * 20;
      return (0, _components.waitForDataAndSetState)((0, _fetch.search)(textInput, allFilters, offset), this, 'datasets');
    }
  }, {
    key: 'pushToHistory',
    value: function pushToHistory() {
      var _state2 = this.state,
          textInput = _state2.textInput,
          filters = _state2.filters,
          page = _state2.page;

      var query = buildSearchQuery(textInput, filters, page);
      if (window.location.search === '?' + query) return;
      _reactRouter.browserHistory.push('/search?' + query);
    }
  }, {
    key: 'search',
    value: function search() {
      var _this2 = this;

      var changes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var pushToHistory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

      return this.setState(changes, function () {
        if (pushToHistory) _this2.pushToHistory();
        return _this2.fetchRecords();
      });
    }
  }, {
    key: 'addFilter',
    value: function addFilter(filter) {
      var filters = (0, _manageFilters.addFilter)(this.state.filters, filter);
      return this.search({ filters: filters, page: 1, datasets: null });
    }
  }, {
    key: 'removeFilter',
    value: function removeFilter(filter) {
      var filters = (0, _manageFilters.removeFilter)(this.state.filters, filter);
      return this.search({ filters: filters, page: 1, datasets: null });
    }
  }, {
    key: 'userSearch',
    value: function userSearch(textInput) {
      return this.search({ textInput: textInput, datasets: null, page: 1 });
    }
  }, {
    key: 'handleChangePage',
    value: function handleChangePage(_ref) {
      var selected = _ref.selected;

      return this.search({ page: selected + 1 });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var _state3 = this.state,
          textInput = _state3.textInput,
          filters = _state3.filters,
          datasets = _state3.datasets,
          page = _state3.page,
          errors = _state3.errors;

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          { className: _Datasets2.default.searchWrapper },
          _react2.default.createElement(_SearchInput2.default, {
            textInput: textInput,
            filters: filters,
            searchButton: true,
            onSearch: function onSearch(textInput) {
              return _this3.userSearch(textInput);
            } }),
          _react2.default.createElement(
            'div',
            { className: _Datasets2.default.filters },
            filters.length ? 'Filtres actifs' : 'Aucun filtre actif'
          ),
          filters.map(function (filter, idx) {
            return _react2.default.createElement(_Filter2.default, { detail: true, remove: true, key: idx, filter: filter, onClick: function onClick(filter) {
                return _this3.removeFilter(filter);
              } });
          })
        ),
        _react2.default.createElement(_DatasetsResults2.default, {
          datasets: datasets,
          filters: filters,
          page: page,
          addFilter: function addFilter(filter) {
            return _this3.addFilter(filter);
          },
          handleChangePage: function handleChangePage(data) {
            return _this3.handleChangePage(data);
          },
          errors: errors })
      );
    }
  }]);

  return Datasets;
}(_react.Component);

exports.default = Datasets;

/***/ }),
/* 253 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _DatasetPreview = __webpack_require__(249);

var _DatasetPreview2 = _interopRequireDefault(_DatasetPreview);

var _Facets = __webpack_require__(213);

var _Facets2 = _interopRequireDefault(_Facets);

var _ContentLoader = __webpack_require__(20);

var _ContentLoader2 = _interopRequireDefault(_ContentLoader);

var _WrappedPagination = __webpack_require__(218);

var _WrappedPagination2 = _interopRequireDefault(_WrappedPagination);

var _DatasetsResults = __webpack_require__(669);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DatasetsResults = function DatasetsResults(_ref) {
  var datasets = _ref.datasets,
      filters = _ref.filters,
      page = _ref.page,
      _addFilter = _ref.addFilter,
      handleChangePage = _ref.handleChangePage,
      errors = _ref.errors;

  if (!!errors.length) {
    return _react2.default.createElement(
      'div',
      null,
      'Une erreur est survenue.',
      errors.map(function (error, idx) {
        return _react2.default.createElement(
          'p',
          { key: idx },
          error
        );
      })
    );
  }

  if (!datasets) {
    return _react2.default.createElement(
      'div',
      { className: _DatasetsResults.loader },
      _react2.default.createElement(_ContentLoader2.default, null)
    );
  }

  if (!datasets.count) {
    return _react2.default.createElement(
      'div',
      { className: _DatasetsResults.results },
      'Aucun jeu de donn\xE9es trouv\xE9.'
    );
  }

  var max = datasets ? Math.ceil(datasets.count / datasets.query.limit) : 0;
  return _react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(
      'div',
      { className: _DatasetsResults.counter },
      _react2.default.createElement(
        'strong',
        null,
        datasets.count
      ),
      ' ',
      datasets.count > 1 ? 'jeux de données trouvés' : 'jeu de données trouvé'
    ),
    _react2.default.createElement(
      'div',
      { className: _DatasetsResults.results },
      _react2.default.createElement(
        'div',
        { className: _DatasetsResults.result },
        datasets.results.map(function (dataset) {
          return _react2.default.createElement(_DatasetPreview2.default, { key: dataset._id, dataset: dataset, addFilter: function addFilter(filter) {
              return _addFilter(filter);
            } });
        })
      ),
      _react2.default.createElement(_Facets2.default, {
        facets: datasets.facets,
        filters: filters,
        addFilter: function addFilter(filter) {
          return _addFilter(filter);
        } })
    ),
    _react2.default.createElement(
      'div',
      { className: _DatasetsResults.paginationWrapper },
      _react2.default.createElement(_WrappedPagination2.default, { max: max, page: page, handleChangePage: handleChangePage })
    )
  );
};

exports.default = DatasetsResults;

/***/ }),
/* 254 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Message = __webpack_require__(256);

var _Message2 = _interopRequireDefault(_Message);

var _Discussion = __webpack_require__(670);

var _Discussion2 = _interopRequireDefault(_Discussion);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Discussion = function (_Component) {
  _inherits(Discussion, _Component);

  function Discussion(props) {
    _classCallCheck(this, Discussion);

    var _this = _possibleConstructorReturn(this, (Discussion.__proto__ || Object.getPrototypeOf(Discussion)).call(this, props));

    _this.state = { more: false };
    return _this;
  }

  _createClass(Discussion, [{
    key: 'displayMore',
    value: function displayMore() {
      this.setState({ more: !this.state.more });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var more = this.state.more;
      var _props = this.props,
          discussion = _props.discussion,
          datasetId = _props.datasetId;

      var conversation = discussion.discussion.map(function (msg, idx) {
        return _react2.default.createElement(_Message2.default, { key: idx, message: msg });
      });
      var repliesNb = discussion.discussion.length - 1;
      var replies = void 0;

      if (!repliesNb) {
        replies = 'Aucune réponse';
      } else if (repliesNb === 1) {
        replies = '1 réponse';
      } else {
        replies = repliesNb + ' r\xE9ponses';
      }

      return _react2.default.createElement(
        'div',
        { className: _Discussion2.default.container },
        discussion.closed ? _react2.default.createElement(
          'div',
          { className: _Discussion2.default.resolved },
          _react2.default.createElement('i', { className: 'checkmark icon' })
        ) : null,
        _react2.default.createElement(
          'div',
          { className: _Discussion2.default.title },
          discussion.title
        ),
        _react2.default.createElement(
          'div',
          { className: _Discussion2.default.messages },
          more ? conversation : _react2.default.createElement(_Message2.default, { message: discussion.discussion[0] }),
          _react2.default.createElement(
            'div',
            { className: _Discussion2.default.action },
            more || !repliesNb ? _react2.default.createElement(
              'a',
              { className: _Discussion2.default.answer, href: 'https://www.data.gouv.fr/fr/datasets/' + datasetId + '/#discussion-' + discussion.id },
              'R\xE9pondre sur data.gouv.fr'
            ) : null,
            _react2.default.createElement(
              'div',
              { className: _Discussion2.default.replies, onClick: function onClick() {
                  return _this2.displayMore();
                } },
              more ? 'Fermer' : replies
            )
          )
        )
      );
    }
  }]);

  return Discussion;
}(_react.Component);

exports.default = Discussion;

/***/ }),
/* 255 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Discussion = __webpack_require__(254);

var _Discussion2 = _interopRequireDefault(_Discussion);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _Discussions = __webpack_require__(671);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Discussions = function (_Component) {
  _inherits(Discussions, _Component);

  function Discussions(props) {
    _classCallCheck(this, Discussions);

    var _this = _possibleConstructorReturn(this, (Discussions.__proto__ || Object.getPrototypeOf(Discussions)).call(this, props));

    _this.state = { errors: [] };
    return _this;
  }

  _createClass(Discussions, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var datasetId = this.props.datasetId;


      if (!datasetId) return;
      return (0, _components.waitForDataAndSetState)((0, _fetch.getDiscussions)(datasetId), this, 'discussions');
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'render',
    value: function render() {
      var discussions = this.state.discussions;
      var datasetId = this.props.datasetId;


      return _react2.default.createElement(
        'div',
        { className: _Discussions.container },
        discussions ? discussions.data.map(function (discussion, idx) {
          return _react2.default.createElement(_Discussion2.default, { key: idx, datasetId: datasetId, discussion: discussion });
        }) : null,
        _react2.default.createElement(
          'a',
          { href: 'https://www.data.gouv.fr/fr/datasets/' + datasetId + '/#discussion-create' },
          'D\xE9marrer une nouvelle discussion sur data.gouv.fr'
        )
      );
    }
  }]);

  return Discussions;
}(_react.Component);

exports.default = Discussions;

/***/ }),
/* 256 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _doneSince = __webpack_require__(49);

var _Message = __webpack_require__(672);

var _Message2 = _interopRequireDefault(_Message);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Message = function Message(_ref) {
  var message = _ref.message;

  return _react2.default.createElement(
    'div',
    { className: _Message2.default.message },
    _react2.default.createElement(
      'a',
      { href: message.posted_by.page },
      _react2.default.createElement('img', { className: _Message2.default.avatar, src: message.posted_by.avatar || '/assets/avatar.png', alt: 'avatar' })
    ),
    _react2.default.createElement(
      'div',
      { className: _Message2.default.content },
      _react2.default.createElement(
        'div',
        { className: _Message2.default.header },
        _react2.default.createElement(
          'div',
          { className: _Message2.default.userName },
          message.posted_by.first_name,
          ' ',
          message.posted_by.last_name
        ),
        _react2.default.createElement(
          'div',
          { className: _Message2.default.postedOn },
          (0, _doneSince.doneSince)(message.posted_on)
        )
      ),
      _react2.default.createElement(
        'div',
        null,
        message.content
      )
    )
  );
};

exports.default = Message;

/***/ }),
/* 257 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _strRightBack = __webpack_require__(704);

var _strRightBack2 = _interopRequireDefault(_strRightBack);

var _Download = __webpack_require__(673);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var FORMATS = [{ label: 'GeoJSON', format: 'GeoJSON', projection: 'WGS84' }, { label: 'SHP/L93', format: 'SHP', projection: 'Lambert93' }, { label: 'SHP/W84', format: 'SHP', projection: 'WGS84' }, { label: 'KML', format: 'KML', projection: 'WGS84' }, { label: 'CSV', format: 'CSV', projection: 'WGS84' }];

var Download = function Download(_ref) {
  var distribution = _ref.distribution,
      isPreview = _ref.isPreview,
      preview = _ref.preview;

  var link = 'https://inspire.data.gouv.fr/api/geogw/';
  var layerName = void 0;

  if (distribution.type === 'file-package') {
    layerName = (0, _strRightBack2.default)(distribution.layer, '/');
    link += 'file-packages/' + distribution.hashedLocation + '/' + layerName + '/download';
  }

  if (distribution.type === 'wfs-featureType') {
    link += 'services/' + distribution.service + '/feature-types/' + distribution.typeName + '/download';
  }

  var name = layerName || distribution.typeName;

  return _react2.default.createElement(
    'div',
    { className: _Download.download },
    _react2.default.createElement(
      'div',
      { className: _Download.title },
      name
    ),
    _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'div',
        { className: _Download.container },
        _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'div',
            null,
            'T\xE9l\xE9charger',
            _react2.default.createElement('i', { className: 'download icon' })
          ),
          _react2.default.createElement(
            'div',
            { className: _Download.formats },
            !distribution.available ? _react2.default.createElement(
              'p',
              null,
              'Indisponible'
            ) : FORMATS.map(function (format, idx) {
              return _react2.default.createElement(
                'a',
                { key: idx, href: link + ('?format=' + format.format + '&projection=' + format.projection) },
                format.label
              );
            })
          )
        ),
        !distribution.available ? _react2.default.createElement(
          'button',
          { className: _Download.viewerButton, disabled: true },
          'Visualiser'
        ) : _react2.default.createElement(
          'button',
          { className: _Download.viewerButton, onClick: function onClick() {
              return preview({ distribution: distribution, link: link });
            } },
          'Visualiser ',
          isPreview ? _react2.default.createElement('i', { className: 'unhide icon' }) : null
        )
      )
    )
  );
};

exports.default = Download;

/***/ }),
/* 258 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _VectorDownload = __webpack_require__(260);

var _VectorDownload2 = _interopRequireDefault(_VectorDownload);

var _OtherDownload = __webpack_require__(259);

var _OtherDownload2 = _interopRequireDefault(_OtherDownload);

var _Viewer = __webpack_require__(269);

var _Viewer2 = _interopRequireDefault(_Viewer);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _DownloadDatasets = __webpack_require__(674);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DownloadDatasets = function (_Component) {
  _inherits(DownloadDatasets, _Component);

  function DownloadDatasets(props) {
    _classCallCheck(this, DownloadDatasets);

    var _this = _possibleConstructorReturn(this, (DownloadDatasets.__proto__ || Object.getPrototypeOf(DownloadDatasets)).call(this, props));

    _this.state = {
      preview: null,
      geojson: null,
      errors: []
    };
    return _this;
  }

  _createClass(DownloadDatasets, [{
    key: 'selectPreview',
    value: function selectPreview(preview) {
      this.setState({ geojson: null, errors: [], preview: preview });
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchGeoJSON)(preview.link), this, 'geojson');
    }
  }, {
    key: 'resetPreview',
    value: function resetPreview() {
      this.setState({ preview: null });
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var distributions = this.props.distributions;
      var _state = this.state,
          preview = _state.preview,
          geojson = _state.geojson,
          errors = _state.errors;

      var vectorDistributions = distributions.filter(function (distribution) {
        return !distribution.originalDistribution;
      });
      var otherDistributions = distributions.filter(function (distribution) {
        return distribution.originalDistribution === true;
      });

      var otherDownload = otherDistributions.length ? _react2.default.createElement(_OtherDownload2.default, { distributions: otherDistributions }) : null;
      var vectorDownload = _react2.default.createElement(_VectorDownload2.default, { distributions: vectorDistributions, choosePreview: function choosePreview(format) {
          return _this2.selectPreview(format);
        }, preview: preview });

      return _react2.default.createElement(
        'div',
        { className: _DownloadDatasets.content },
        _react2.default.createElement(
          'div',
          { className: _DownloadDatasets.vector },
          _react2.default.createElement(
            'h4',
            null,
            'Donn\xE9es vectorielles'
          ),
          vectorDownload,
          otherDownload
        ),
        _react2.default.createElement(_Viewer2.default, {
          closePreview: function closePreview() {
            return _this2.resetPreview();
          },
          preview: preview,
          geojson: geojson,
          errors: errors })
      );
    }
  }]);

  return DownloadDatasets;
}(_react.Component);

exports.default = DownloadDatasets;

/***/ }),
/* 259 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _OtherDownload = __webpack_require__(675);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var OtherDownload = function OtherDownload(_ref) {
  var distributions = _ref.distributions;

  return _react2.default.createElement(
    'div',
    { className: _OtherDownload.other },
    _react2.default.createElement(
      'h4',
      null,
      'Autres Donn\xE9es'
    ),
    distributions.map(function (distribution, idx) {
      if (distribution.available) {
        return _react2.default.createElement(
          'a',
          { key: idx, href: distribution.location },
          distribution.name
        );
      }
      return _react2.default.createElement(
        'div',
        { key: idx },
        distribution.name
      );
    })
  );
};

exports.default = OtherDownload;

/***/ }),
/* 260 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Download = __webpack_require__(257);

var _Download2 = _interopRequireDefault(_Download);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var VectorDownload = function VectorDownload(_ref) {
  var distributions = _ref.distributions,
      preview = _ref.preview,
      choosePreview = _ref.choosePreview;

  if (!distributions.length) {
    return _react2.default.createElement(
      'div',
      null,
      'Aucune donnée n\'est téléchargeable.'
    );
  }

  return _react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(
      'div',
      null,
      'S\xE9lectionner un format de t\xE9l\xE9chargement\xA0:'
    ),
    distributions.map(function (distribution, idx) {
      return _react2.default.createElement(_Download2.default, {
        key: idx,
        distribution: distribution,
        isPreview: preview && preview.distribution._id === distribution._id,
        preview: function preview(_preview) {
          return choosePreview(_preview);
        } });
    })
  );
};

exports.default = VectorDownload;

/***/ }),
/* 261 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _Facet = __webpack_require__(72);

var _Facet2 = _interopRequireDefault(_Facet);

var _FiltersSection = __webpack_require__(676);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var FiltersSection = function FiltersSection(_ref) {
  var keywords = _ref.keywords,
      organizations = _ref.organizations,
      catalogs = _ref.catalogs;

  var goToSearch = function goToSearch(filter) {
    return function () {
      return _reactRouter.browserHistory.push({ pathname: '/search', query: Object.assign({}, filter) });
    };
  };
  var sections = [{ name: 'organization', title: 'Organisations', filters: organizations }, { name: 'catalog', title: 'Catalogues', filters: catalogs.map(function (catalog) {
      return catalog.name;
    }) }, { name: 'keyword', title: 'Mots-clés', filters: keywords }];

  return _react2.default.createElement(
    'div',
    null,
    sections.map(function (section) {
      return _react2.default.createElement(
        'div',
        { key: section.title, className: _FiltersSection.group },
        _react2.default.createElement(
          'h3',
          null,
          section.title
        ),
        _react2.default.createElement(
          'div',
          { className: _FiltersSection.facets },
          section.filters.map(function (filter, idx) {
            return _react2.default.createElement(_Facet2.default, { key: idx, value: filter, addFilter: goToSearch(_defineProperty({}, section.name, filter)) });
          })
        )
      );
    })
  );
};

exports.default = FiltersSection;

/***/ }),
/* 262 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _LinksSection = __webpack_require__(677);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var LinksSection = function LinksSection(_ref) {
  var links = _ref.links,
      style = _ref.style;

  // Some links have no name, use href as fallback
  var getName = function getName(link) {
    return link.name ? link.name : link.href;
  };

  return _react2.default.createElement(
    'div',
    null,
    links.length ? _react2.default.createElement(
      'ul',
      { className: _LinksSection.linkList },
      links.map(function (link, idx) {
        return _react2.default.createElement(
          'li',
          { key: idx },
          _react2.default.createElement(
            'a',
            { style: style, href: link.href },
            getName(link)
          )
        );
      })
    ) : _react2.default.createElement(
      'div',
      null,
      'Aucun lien disponible'
    )
  );
};

exports.default = LinksSection;

/***/ }),
/* 263 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _marked = __webpack_require__(115);

var _marked2 = _interopRequireDefault(_marked);

__webpack_require__(678);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MarkdownViewer = function MarkdownViewer(_ref) {
  var markdown = _ref.markdown;

  var md = (0, _marked2.default)(markdown);
  return _react2.default.createElement('p', { className: 'markdown-wrapper', dangerouslySetInnerHTML: { __html: md } });
};

exports.default = MarkdownViewer;

/***/ }),
/* 264 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _CenteredMap = __webpack_require__(122);

var _CenteredMap2 = _interopRequireDefault(_CenteredMap);

var _ContentLoader = __webpack_require__(20);

var _ContentLoader2 = _interopRequireDefault(_ContentLoader);

var _PreviewMap = __webpack_require__(679);

var _PreviewMap2 = _interopRequireDefault(_PreviewMap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MAP = {
  lat: 47,
  lon: 1,
  zoom: 5.5
};

var styleLoader = {
  width: '6em',
  height: '6em',
  top: '46%',
  left: '50%',
  borderWidth: '10px'
};

var PreviewMap = function (_Component) {
  _inherits(PreviewMap, _Component);

  function PreviewMap() {
    _classCallCheck(this, PreviewMap);

    return _possibleConstructorReturn(this, (PreviewMap.__proto__ || Object.getPrototypeOf(PreviewMap)).apply(this, arguments));
  }

  _createClass(PreviewMap, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          geojson = _props.geojson,
          distribution = _props.distribution;

      var errors = [].concat(_toConsumableArray(this.props.errors));

      if (geojson && (!geojson.features || geojson.features.length === 0)) {
        errors.push('Les données sont vides');
      }

      var err = _react2.default.createElement(
        'div',
        { className: _PreviewMap2.default.errors },
        _react2.default.createElement(
          'strong',
          null,
          'Une erreur est survenue lors du chargement de ',
          distribution && (distribution.typeName || distribution.layer)
        ),
        _react2.default.createElement('br', null),
        errors
      );

      var loader = !geojson && !errors.length ? _react2.default.createElement(
        'div',
        { className: _PreviewMap2.default.load },
        _react2.default.createElement(_ContentLoader2.default, { style: styleLoader })
      ) : null;

      return _react2.default.createElement(
        'div',
        { className: _PreviewMap2.default.container },
        errors.length ? err : null,
        loader,
        geojson ? _react2.default.createElement(_CenteredMap2.default, { vectors: geojson, className: _PreviewMap2.default.map, zoom: MAP.zoom, lat: MAP.lat, lon: MAP.lon }) : null
      );
    }
  }]);

  return PreviewMap;
}(_react.Component);

exports.default = PreviewMap;

/***/ }),
/* 265 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _Producer = __webpack_require__(680);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Producer = function (_Component) {
  _inherits(Producer, _Component);

  function Producer(props) {
    _classCallCheck(this, Producer);

    var _this = _possibleConstructorReturn(this, (Producer.__proto__ || Object.getPrototypeOf(Producer)).call(this, props));

    _this.state = { errors: [] };
    return _this;
  }

  _createClass(Producer, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var datasetId = this.props.datasetId;


      if (!datasetId) return;
      return (0, _components.waitForDataAndSetState)((0, _fetch.getDatasetOnDataGouv)(datasetId), this, 'dataset');
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'render',
    value: function render() {
      var datasetId = this.props.datasetId;
      var dataset = this.state.dataset;


      if (!datasetId || !dataset || !dataset.organization) return null;

      return _react2.default.createElement(
        'div',
        { className: _Producer.container },
        _react2.default.createElement('img', { src: dataset ? dataset.organization.logo : '/assets/avatar.png', alt: 'producer logo' }),
        _react2.default.createElement(
          'h4',
          null,
          dataset.organization.name
        )
      );
    }
  }]);

  return Producer;
}(_react.Component);

exports.default = Producer;

/***/ }),
/* 266 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _CenteredMap = __webpack_require__(122);

var _CenteredMap2 = _interopRequireDefault(_CenteredMap);

var _SpatialExtentMap = __webpack_require__(681);

var _SpatialExtentMap2 = _interopRequireDefault(_SpatialExtentMap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function SpatialExtentMap(_ref) {
  var extent = _ref.extent;

  var feature = { type: 'Feature', geometry: extent, properties: {} };
  var fc = { type: 'FeatureCollection', features: [feature] };

  return _react2.default.createElement(
    'div',
    { className: _SpatialExtentMap2.default.container },
    _react2.default.createElement(_CenteredMap2.default, { vectors: fc, className: _SpatialExtentMap2.default.map, frozen: true })
  );
}

exports.default = SpatialExtentMap;

/***/ }),
/* 267 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _moment = __webpack_require__(11);

var _moment2 = _interopRequireDefault(_moment);

var _doneSince = __webpack_require__(49);

var _frequencies = __webpack_require__(226);

var _topicCategories = __webpack_require__(230);

var _status = __webpack_require__(78);

var _dataGouvChecks = __webpack_require__(48);

var _TechnicalInformations = __webpack_require__(682);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var TechnicalInformations = function TechnicalInformations(_ref) {
  var dataset = _ref.dataset;
  var _dataset$metadata = dataset.metadata,
      type = _dataset$metadata.type,
      status = _dataset$metadata.status,
      updateFrequency = _dataset$metadata.updateFrequency,
      creationDate = _dataset$metadata.creationDate,
      revisionDate = _dataset$metadata.revisionDate,
      equivalentScaleDenominator = _dataset$metadata.equivalentScaleDenominator,
      spatialResolution = _dataset$metadata.spatialResolution,
      topicCategory = _dataset$metadata.topicCategory;

  var createDate = creationDate ? (0, _moment2.default)(creationDate).format('DD/MM/YYYY') : 'inconnue';
  var license = (0, _dataGouvChecks.getLicense)(dataset.metadata.license);

  return _react2.default.createElement(
    'div',
    { className: _TechnicalInformations.container },
    _react2.default.createElement(
      'div',
      { className: _TechnicalInformations.histo },
      _react2.default.createElement(
        'h4',
        null,
        'Cycle de vie de la donn\xE9e (selon producteur)'
      ),
      _react2.default.createElement(
        'div',
        null,
        'Fr\xE9quence de mise \xE0 jour : ',
        _react2.default.createElement(
          'b',
          null,
          updateFrequency ? _frequencies.frequencies[updateFrequency] : 'inconnue'
        )
      ),
      _react2.default.createElement(
        'div',
        null,
        'Date de cr\xE9ation : ',
        _react2.default.createElement(
          'b',
          null,
          createDate
        )
      ),
      _react2.default.createElement(
        'div',
        null,
        'Derni\xE8re mise \xE0 jour : ',
        _react2.default.createElement(
          'b',
          null,
          revisionDate ? (0, _doneSince.doneSince)(revisionDate) : createDate
        )
      )
    ),
    _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'h4',
        null,
        'Autres informations'
      ),
      _react2.default.createElement(
        'div',
        null,
        'Cat\xE9gorie du jeu de donn\xE9es : ',
        _react2.default.createElement(
          'b',
          null,
          _topicCategories.topicCategories[topicCategory] || 'non renseignée'
        )
      ),
      _react2.default.createElement(
        'div',
        null,
        'Type : ',
        _react2.default.createElement(
          'b',
          null,
          type || 'inconnu'
        )
      ),
      _react2.default.createElement(
        'div',
        null,
        'Licence : ',
        license.name ? _react2.default.createElement(
          'a',
          { href: license.link },
          license.name
        ) : _react2.default.createElement(
          'b',
          null,
          'license'
        )
      ),
      status && _status.statusTranslate[status] ? _react2.default.createElement(
        'div',
        null,
        '\xC9tat : ',
        _react2.default.createElement(
          'b',
          null,
          _status.statusTranslate[status].status
        )
      ) : null,
      equivalentScaleDenominator ? _react2.default.createElement(
        'div',
        null,
        '\xC9chelle : ',
        _react2.default.createElement(
          'b',
          null,
          '1 / ',
          equivalentScaleDenominator
        )
      ) : null,
      spatialResolution ? _react2.default.createElement(
        'div',
        null,
        'R\xE9solution : ',
        _react2.default.createElement(
          'b',
          null,
          spatialResolution.value,
          ' ',
          spatialResolution.unit
        )
      ) : null
    )
  );
};

exports.default = TechnicalInformations;

/***/ }),
/* 268 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Thumbnails = __webpack_require__(683);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Thumbnails = function (_Component) {
  _inherits(Thumbnails, _Component);

  function Thumbnails(props) {
    _classCallCheck(this, Thumbnails);

    var _this = _possibleConstructorReturn(this, (Thumbnails.__proto__ || Object.getPrototypeOf(Thumbnails)).call(this, props));

    _this.state = { isSelected: props.thumbnails[0] };
    return _this;
  }

  _createClass(Thumbnails, [{
    key: 'selectThumbnail',
    value: function selectThumbnail(thumbnail) {
      this.setState({ isSelected: thumbnail });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var isSelected = this.state.isSelected;
      var _props = this.props,
          recordId = _props.recordId,
          thumbnails = _props.thumbnails;


      var thumbnailsList = thumbnails.length > 1 ? thumbnails.map(function (thumbnail, idx) {
        return _react2.default.createElement(
          'div',
          { key: idx, onClick: function onClick() {
              return _this2.selectThumbnail(thumbnail);
            } },
          _react2.default.createElement('img', { className: thumbnail === isSelected ? _Thumbnails.selected : null, src: 'https://inspire.data.gouv.fr/api/geogw/records/' + recordId + '/thumbnails/' + thumbnail.originalUrlHash, alt: thumbnail.description })
        );
      }) : null;

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          { className: _Thumbnails.main },
          _react2.default.createElement('img', { src: 'https://inspire.data.gouv.fr/api/geogw/records/' + recordId + '/thumbnails/' + isSelected.originalUrlHash, alt: isSelected.originalUrlHash })
        ),
        _react2.default.createElement(
          'div',
          { className: _Thumbnails.list },
          thumbnailsList
        )
      );
    }
  }]);

  return Thumbnails;
}(_react.Component);

exports.default = Thumbnails;

/***/ }),
/* 269 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _DatasetTable = __webpack_require__(251);

var _DatasetTable2 = _interopRequireDefault(_DatasetTable);

var _PreviewMap = __webpack_require__(264);

var _PreviewMap2 = _interopRequireDefault(_PreviewMap);

var _Viewer = __webpack_require__(684);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Viewer = function (_Component) {
  _inherits(Viewer, _Component);

  function Viewer(props) {
    _classCallCheck(this, Viewer);

    var _this = _possibleConstructorReturn(this, (Viewer.__proto__ || Object.getPrototypeOf(Viewer)).call(this, props));

    _this.state = { mode: 'map' };
    return _this;
  }

  _createClass(Viewer, [{
    key: 'changeMode',
    value: function changeMode(mode) {
      this.setState({ mode: mode });
    }
  }, {
    key: 'closed',
    value: function closed() {}
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var mode = this.state.mode;
      var _props = this.props,
          preview = _props.preview,
          geojson = _props.geojson,
          closePreview = _props.closePreview,
          errors = _props.errors;


      if (!preview) return null;

      if (mode === 'map') {
        return _react2.default.createElement(
          'div',
          { className: _Viewer.visualizer },
          _react2.default.createElement(
            'div',
            { className: _Viewer.buttons },
            _react2.default.createElement(
              'button',
              { className: _Viewer.active },
              'Carte'
            ),
            _react2.default.createElement(
              'button',
              { onClick: function onClick() {
                  return _this2.changeMode('table');
                } },
              'Tableau'
            ),
            _react2.default.createElement(
              'button',
              { className: _Viewer.closeButton, onClick: function onClick() {
                  return closePreview();
                } },
              'X'
            )
          ),
          _react2.default.createElement(_PreviewMap2.default, {
            distribution: preview.distribution,
            geojson: geojson,
            errors: errors })
        );
      } else {
        return _react2.default.createElement(
          'div',
          { className: _Viewer.visualizer },
          _react2.default.createElement(
            'div',
            { className: _Viewer.buttons },
            _react2.default.createElement(
              'button',
              { onClick: function onClick() {
                  return _this2.changeMode('map');
                } },
              'Carte'
            ),
            _react2.default.createElement(
              'button',
              { className: _Viewer.active },
              'Tableau'
            ),
            _react2.default.createElement(
              'button',
              { className: _Viewer.closeButton, onClick: function onClick() {
                  return closePreview();
                } },
              'X'
            )
          ),
          _react2.default.createElement(_DatasetTable2.default, { geojson: geojson })
        );
      }
    }
  }]);

  return Viewer;
}(_react.Component);

exports.default = Viewer;

/***/ }),
/* 270 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _LinksSection = __webpack_require__(262);

var _LinksSection2 = _interopRequireDefault(_LinksSection);

var _DatasetSection = __webpack_require__(250);

var _DatasetSection2 = _interopRequireDefault(_DatasetSection);

var _DatasetChecklist = __webpack_require__(248);

var _DatasetChecklist2 = _interopRequireDefault(_DatasetChecklist);

var _DownloadDatasets = __webpack_require__(258);

var _DownloadDatasets2 = _interopRequireDefault(_DownloadDatasets);

var _FiltersSection = __webpack_require__(261);

var _FiltersSection2 = _interopRequireDefault(_FiltersSection);

var _Contacts = __webpack_require__(247);

var _Contacts2 = _interopRequireDefault(_Contacts);

var _Thumbnails = __webpack_require__(268);

var _Thumbnails2 = _interopRequireDefault(_Thumbnails);

var _Producer = __webpack_require__(265);

var _Producer2 = _interopRequireDefault(_Producer);

var _Discussions = __webpack_require__(255);

var _Discussions2 = _interopRequireDefault(_Discussions);

var _TechnicalInformations = __webpack_require__(267);

var _TechnicalInformations2 = _interopRequireDefault(_TechnicalInformations);

var _SpatialExtentMap = __webpack_require__(266);

var _SpatialExtentMap2 = _interopRequireDefault(_SpatialExtentMap);

var _status = __webpack_require__(78);

var _Section = __webpack_require__(125);

var _Section2 = _interopRequireDefault(_Section);

var _DatasetDetail = __webpack_require__(192);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DatasetDetail = function (_Component) {
  _inherits(DatasetDetail, _Component);

  function DatasetDetail(props) {
    _classCallCheck(this, DatasetDetail);

    var _this = _possibleConstructorReturn(this, (DatasetDetail.__proto__ || Object.getPrototypeOf(DatasetDetail)).call(this, props));

    _this.state = { errors: [], statusWarning: _this.isWarningStatus() };
    return _this;
  }

  _createClass(DatasetDetail, [{
    key: 'isWarningStatus',
    value: function isWarningStatus() {
      var dataset = this.props.dataset;


      if (dataset.metadata.status) {
        if (_status.statusTranslate[dataset.metadata.status] && _status.statusTranslate[dataset.metadata.status].consequences) {
          return true;
        }
      }
      return false;
    }
  }, {
    key: 'hideStatusWarning',
    value: function hideStatusWarning() {
      this.setState({ statusWarning: false });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var statusWarning = this.state.statusWarning;
      var _props = this.props,
          dataset = _props.dataset,
          catalogs = _props.catalogs,
          dataGouvPublication = _props.dataGouvPublication;

      var remoteId = dataGouvPublication ? dataGouvPublication.remoteId : null;

      if (statusWarning) {
        return _react2.default.createElement(
          'div',
          { className: _DatasetDetail.warning },
          _react2.default.createElement(_DatasetSection2.default, { dataset: dataset, warning: statusWarning, hideStatusWarning: function hideStatusWarning() {
              return _this2.hideStatusWarning();
            } })
        );
      }

      return _react2.default.createElement(
        'div',
        { className: _DatasetDetail.container },
        _react2.default.createElement(
          'div',
          { className: _DatasetDetail.main },
          _react2.default.createElement(_DatasetSection2.default, { dataset: dataset }),
          _react2.default.createElement(
            _Section2.default,
            { title: 'Informations techniques' },
            _react2.default.createElement(_TechnicalInformations2.default, { dataset: dataset })
          ),
          _react2.default.createElement(
            _Section2.default,
            { title: 'Téléchargements' },
            _react2.default.createElement(_DownloadDatasets2.default, { distributions: dataset.dataset.distributions })
          ),
          _react2.default.createElement(
            _Section2.default,
            { title: 'Liens' },
            _react2.default.createElement(_LinksSection2.default, { links: dataset.metadata.links })
          ),
          _react2.default.createElement(
            _Section2.default,
            { title: 'Discussions' },
            _react2.default.createElement(_Discussions2.default, { datasetId: remoteId })
          ),
          _react2.default.createElement(
            _Section2.default,
            { title: 'Filtres' },
            _react2.default.createElement(_FiltersSection2.default, { keywords: dataset.metadata.keywords, organizations: dataset.organizations, catalogs: catalogs.filter(function (catalog) {
                return dataset.catalogs.includes(catalog._id);
              }) })
          ),
          _react2.default.createElement(
            'div',
            null,
            'Identifiant du jeu de donn\xE9es : ',
            _react2.default.createElement(
              'b',
              null,
              dataset.metadata.id
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: _DatasetDetail.side },
          remoteId ? _react2.default.createElement(
            _Section2.default,
            { title: 'Producteur' },
            _react2.default.createElement(_Producer2.default, { datasetId: remoteId })
          ) : null,
          dataset.metadata.thumbnails && dataset.metadata.thumbnails.length ? _react2.default.createElement(
            _Section2.default,
            { title: 'Aperçu des données' },
            _react2.default.createElement(_Thumbnails2.default, { recordId: dataset.recordId, thumbnails: dataset.metadata.thumbnails })
          ) : null,
          dataset.metadata.spatialExtent ? _react2.default.createElement(
            _Section2.default,
            { title: 'Étendue spatiale' },
            _react2.default.createElement(_SpatialExtentMap2.default, { extent: dataset.metadata.spatialExtent })
          ) : null,
          _react2.default.createElement(
            _Section2.default,
            { title: 'Publication sur data.gouv.fr' },
            _react2.default.createElement(_DatasetChecklist2.default, { dataset: dataset })
          ),
          _react2.default.createElement(
            _Section2.default,
            { title: 'Contacts' },
            _react2.default.createElement(_Contacts2.default, { contacts: dataset.metadata.contacts })
          ),
          dataset.metadata.credit ? _react2.default.createElement(
            _Section2.default,
            { title: 'Contributions' },
            dataset.metadata.credit
          ) : null
        )
      );
    }
  }]);

  return DatasetDetail;
}(_react.Component);

exports.default = DatasetDetail;

/***/ }),
/* 271 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Errors = __webpack_require__(13);

var _Errors2 = _interopRequireDefault(_Errors);

var _components = __webpack_require__(6);

var _fetch = __webpack_require__(4);

var _ActivateOrganization = __webpack_require__(686);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ActivateOrganization = function (_Component) {
  _inherits(ActivateOrganization, _Component);

  function ActivateOrganization(props) {
    _classCallCheck(this, ActivateOrganization);

    var _this = _possibleConstructorReturn(this, (ActivateOrganization.__proto__ || Object.getPrototypeOf(ActivateOrganization)).call(this, props));

    _this.state = { errors: [], activating: false };
    return _this;
  }

  _createClass(ActivateOrganization, [{
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'activateAccount',
    value: function activateAccount() {
      var _this2 = this;

      this.setState({ activating: true });
      var cancelablePromise = (0, _components.markAsCancelable)((0, _fetch.updateOrganizationAccount)(this.props.organizationId), this);

      return cancelablePromise.promise.then(function () {
        _this2.setState({ activating: false });
        _this2.props.onActivation();
      }).catch(function (err) {
        if (err.isCanceled) return;
        _this2.setState({
          activating: false,
          errors: ['Impossible d\'activer l\'outil sur votre organisation']
        });
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var _state = this.state,
          errors = _state.errors,
          activating = _state.activating;


      if (errors.length) {
        return _react2.default.createElement(_Errors2.default, { errors: errors });
      }

      return _react2.default.createElement(
        'div',
        { className: _ActivateOrganization.msg },
        _react2.default.createElement(
          'h3',
          null,
          'L\'outil de publication n\'est pas encore activ\xE9.'
        ),
        _react2.default.createElement(
          'button',
          { className: _ActivateOrganization.activate, onClick: function onClick() {
              return _this3.activateAccount();
            }, disabled: activating },
          'Activer l\'outil'
        )
      );
    }
  }]);

  return ActivateOrganization;
}(_react.Component);

exports.default = ActivateOrganization;

/***/ }),
/* 272 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _ContentLoader = __webpack_require__(20);

var _ContentLoader2 = _interopRequireDefault(_ContentLoader);

var _AddButton = __webpack_require__(120);

var _AddButton2 = _interopRequireDefault(_AddButton);

var _CatalogPreview = __webpack_require__(47);

var _CatalogPreview2 = _interopRequireDefault(_CatalogPreview);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

var _catalogs = __webpack_require__(77);

var _AddCatalogs = __webpack_require__(687);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var AddCatalogs = function (_Component) {
  _inherits(AddCatalogs, _Component);

  function AddCatalogs(props) {
    _classCallCheck(this, AddCatalogs);

    var _this = _possibleConstructorReturn(this, (AddCatalogs.__proto__ || Object.getPrototypeOf(AddCatalogs)).call(this, props));

    _this.state = { errors: [] };
    return _this;
  }

  _createClass(AddCatalogs, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchCatalogs)(), this, 'catalogs');
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'render',
    value: function render() {
      var catalogs = this.state.catalogs;
      var _props = this.props,
          sourceCatalogs = _props.sourceCatalogs,
          addCatalog = _props.addCatalog;

      if (!this.state.catalogs) return _react2.default.createElement(
        'div',
        { className: _AddCatalogs.loader },
        _react2.default.createElement(_ContentLoader2.default, null)
      );

      var candidateCatalogs = (0, _catalogs.getCandidateCatalogs)(catalogs, sourceCatalogs);
      var sortedCatalogs = (0, _catalogs.getCatalogOrderByScore)(candidateCatalogs);

      return _react2.default.createElement(
        'div',
        { className: _AddCatalogs.container },
        sortedCatalogs.map(function (catalog, idx) {
          return _react2.default.createElement(
            'div',
            { key: idx, className: _AddCatalogs.card },
            _react2.default.createElement(_CatalogPreview2.default, { catalog: catalog }),
            _react2.default.createElement(_AddButton2.default, { style: _AddCatalogs.add, action: function action() {
                return addCatalog(catalog.id);
              }, text: 'Ajouter' })
          );
        }),
        _react2.default.createElement(
          'div',
          { className: _AddCatalogs.warningMsg },
          _react2.default.createElement('i', { className: 'warning icon' }),
          'Seuls les catalogues disposant de donn\xE9es ouvertes et t\xE9l\xE9chargeables sont disponible ici.'
        )
      );
    }
  }]);

  return AddCatalogs;
}(_react.Component);

exports.default = AddCatalogs;

/***/ }),
/* 273 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _CatalogPreview = __webpack_require__(47);

var _CatalogPreview2 = _interopRequireDefault(_CatalogPreview);

var _fetch = __webpack_require__(4);

var _components = __webpack_require__(6);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Catalog = function (_Component) {
  _inherits(Catalog, _Component);

  function Catalog(props) {
    _classCallCheck(this, Catalog);

    var _this = _possibleConstructorReturn(this, (Catalog.__proto__ || Object.getPrototypeOf(Catalog)).call(this, props));

    _this.state = { catalog: null, errors: [] };
    return _this;
  }

  _createClass(Catalog, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      return (0, _components.waitForDataAndSetState)((0, _fetch.fetchCatalog)(this.props.catalogId), this, 'catalog');
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      return (0, _components.cancelAllPromises)(this);
    }
  }, {
    key: 'render',
    value: function render() {
      var catalog = this.state.catalog;


      if (catalog) return _react2.default.createElement(_CatalogPreview2.default, { catalog: catalog });
      return null;
    }
  }]);

  return Catalog;
}(_react.Component);

exports.default = Catalog;

/***/ }),
/* 274 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _DatasetToSelect = __webpack_require__(688);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DatasetToSelect = function DatasetToSelect(_ref) {
  var dataset = _ref.dataset,
      isSelected = _ref.isSelected,
      inProgress = _ref.inProgress,
      change = _ref.change;


  return _react2.default.createElement(
    'div',
    { className: _DatasetToSelect.data },
    _react2.default.createElement(
      _reactRouter.Link,
      { to: '/datasets/' + dataset._id },
      dataset.title
    ),
    isSelected && inProgress ? _react2.default.createElement(
      'div',
      { className: _DatasetToSelect.progress },
      'Publication en cours...'
    ) : _react2.default.createElement('input', { type: 'checkbox', checked: isSelected, onChange: function onChange() {
        return change(dataset);
      } })
  );
};

exports.default = DatasetToSelect;

/***/ }),
/* 275 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _classnames = __webpack_require__(81);

var _classnames2 = _interopRequireDefault(_classnames);

var _DatasetsToBePublished = __webpack_require__(276);

var _DatasetsToBePublished2 = _interopRequireDefault(_DatasetsToBePublished);

var _PublishedDatasets = __webpack_require__(284);

var _PublishedDatasets2 = _interopRequireDefault(_PublishedDatasets);

var _DatasetsPublication = __webpack_require__(689);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DatasetsPublication = function (_Component) {
  _inherits(DatasetsPublication, _Component);

  function DatasetsPublication() {
    _classCallCheck(this, DatasetsPublication);

    return _possibleConstructorReturn(this, (DatasetsPublication.__proto__ || Object.getPrototypeOf(DatasetsPublication)).apply(this, arguments));
  }

  _createClass(DatasetsPublication, [{
    key: 'render',
    value: function render() {
      var _cx;

      var _props = this.props,
          datasets = _props.datasets,
          title = _props.title,
          _update = _props.update,
          organizationId = _props.organizationId,
          status = _props.status;


      var headerStyle = (0, _classnames2.default)(_DatasetsPublication.header, (_cx = {}, _defineProperty(_cx, _DatasetsPublication.success, status === 'success'), _defineProperty(_cx, _DatasetsPublication.warning, status === 'warning'), _defineProperty(_cx, _DatasetsPublication.error, status === 'error'), _cx));

      return _react2.default.createElement(
        'div',
        { className: _DatasetsPublication.container },
        _react2.default.createElement(
          'div',
          { className: headerStyle },
          _react2.default.createElement(
            'div',
            null,
            title
          ),
          _react2.default.createElement(
            'div',
            null,
            datasets.length
          )
        ),
        status === 'error' ? _react2.default.createElement(_DatasetsToBePublished2.default, { datasets: datasets, update: function update() {
            return _update();
          }, organizationId: organizationId }) : _react2.default.createElement(_PublishedDatasets2.default, { datasets: datasets })
      );
    }
  }]);

  return DatasetsPublication;
}(_react.Component);

exports.default = DatasetsPublication;

/***/ }),
/* 276 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _fetch = __webpack_require__(4);

var _DatasetToSelect = __webpack_require__(274);

var _DatasetToSelect2 = _interopRequireDefault(_DatasetToSelect);

var _DatasetsToBePublished = __webpack_require__(690);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DatasetsToBePublished = function (_Component) {
  _inherits(DatasetsToBePublished, _Component);

  function DatasetsToBePublished(props) {
    _classCallCheck(this, DatasetsToBePublished);

    var _this = _possibleConstructorReturn(this, (DatasetsToBePublished.__proto__ || Object.getPrototypeOf(DatasetsToBePublished)).call(this, props));

    _this.state = {
      toPublish: [],
      publicationInProgress: false
    };
    return _this;
  }

  _createClass(DatasetsToBePublished, [{
    key: 'publishDatasets',
    value: function publishDatasets() {
      var toPublish = this.state.toPublish;
      var organizationId = this.props.organizationId;


      if (toPublish.length) {
        this.setState({ publicationInProgress: true });
        toPublish.map(function (dataset) {
          return (0, _fetch.publishDataset)(dataset._id, organizationId);
        });
      }
    }
  }, {
    key: 'addDatasetToPublish',
    value: function addDatasetToPublish(dataset) {
      var toPublish = this.state.toPublish;


      if (toPublish.includes(dataset)) return;
      toPublish.push(dataset);
      this.setState({ toPublish: toPublish });
    }
  }, {
    key: 'removeDatasetToPublish',
    value: function removeDatasetToPublish(dataset) {
      this.setState({
        toPublish: this.state.toPublish.filter(function (d) {
          return d._id !== dataset._id;
        })
      });
    }
  }, {
    key: 'selection',
    value: function selection() {
      if (this.state.toPublish.length === this.props.datasets.length) {
        this.setState({ toPublish: [] });
      } else {
        this.setState({ toPublish: [].concat(_toConsumableArray(this.props.datasets)) });
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          datasets = _props.datasets,
          update = _props.update;
      var _state = this.state,
          toPublish = _state.toPublish,
          publicationInProgress = _state.publicationInProgress;

      var label = toPublish.length === datasets.length ? 'Tout désélectionner' : 'Tout sélectionner';
      var textButton = toPublish.length === datasets.length ? 'Publier toutes les données' : 'Publier les données sélectionnées';
      var publishButtonStyle = toPublish.length ? _DatasetsToBePublished.publishButton : _DatasetsToBePublished.disable;

      if (!datasets.length) return _react2.default.createElement(
        'div',
        { className: _DatasetsToBePublished.noData },
        'Aucun jeu de donn\xE9es.'
      );
      return _react2.default.createElement(
        'div',
        null,
        datasets.map(function (dataset, idx) {
          var isSelected = toPublish.includes(dataset) === true;
          return _react2.default.createElement(_DatasetToSelect2.default, {
            key: idx,
            dataset: dataset,
            isSelected: isSelected,
            inProgress: publicationInProgress,
            change: isSelected ? function (dataset) {
              return _this2.removeDatasetToPublish(dataset);
            } : function (dataset) {
              return _this2.addDatasetToPublish(dataset);
            } });
        }),
        publicationInProgress ? _react2.default.createElement(
          'button',
          { className: _DatasetsToBePublished.refresh, onClick: function onClick() {
              return update();
            } },
          'Actualiser les donn\xE9es ',
          _react2.default.createElement('i', { className: 'refresh icon' })
        ) : null,
        _react2.default.createElement(
          'div',
          { className: _DatasetsToBePublished.buttons },
          _react2.default.createElement(
            'div',
            { className: _DatasetsToBePublished.button + ' ' + _DatasetsToBePublished.selection, onClick: function onClick() {
                return _this2.selection();
              } },
            label
          ),
          _react2.default.createElement(
            'div',
            { className: _DatasetsToBePublished.button + ' ' + publishButtonStyle, onClick: function onClick() {
                return _this2.publishDatasets();
              } },
            textButton
          )
        )
      );
    }
  }]);

  return DatasetsToBePublished;
}(_react.Component);

exports.default = DatasetsToBePublished;

/***/ }),
/* 277 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _OrganizationProducersPreview = __webpack_require__(282);

var _OrganizationProducersPreview2 = _interopRequireDefault(_OrganizationProducersPreview);

var _OrganizationMetrics = __webpack_require__(280);

var _OrganizationMetrics2 = _interopRequireDefault(_OrganizationMetrics);

var _SourceCatalogs = __webpack_require__(285);

var _SourceCatalogs2 = _interopRequireDefault(_SourceCatalogs);

var _ManageOrganization = __webpack_require__(692);

var _ManageOrganization2 = _interopRequireDefault(_ManageOrganization);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ManageOrganization = function ManageOrganization(_ref) {
  var organization = _ref.organization,
      metrics = _ref.metrics;

  return _react2.default.createElement(
    'div',
    { className: _ManageOrganization2.default.content },
    _react2.default.createElement(
      'div',
      { className: _ManageOrganization2.default.section },
      _react2.default.createElement(
        'h4',
        null,
        'Catalogues source'
      ),
      _react2.default.createElement(_SourceCatalogs2.default, { organizationId: organization._id, sourceCatalogs: organization.sourceCatalogs })
    ),
    _react2.default.createElement(
      'div',
      { className: _ManageOrganization2.default.section },
      _react2.default.createElement(
        'h4',
        null,
        'Producteurs source'
      ),
      _react2.default.createElement(_OrganizationProducersPreview2.default, { organizationId: organization._id, producers: organization.producers })
    ),
    _react2.default.createElement(
      'div',
      { className: _ManageOrganization2.default.section },
      _react2.default.createElement(
        'h4',
        null,
        'Jeux de donn\xE9es'
      ),
      _react2.default.createElement(_OrganizationMetrics2.default, { metrics: metrics, organizationId: organization._id })
    ),
    _react2.default.createElement(
      'div',
      { className: _ManageOrganization2.default.previousPage },
      _react2.default.createElement(
        _reactRouter.Link,
        { to: '/publication' },
        _react2.default.createElement('i', { className: 'arrow left icon' }),
        ' Retour aux organisations'
      )
    )
  );
};

exports.default = ManageOrganization;

/***/ }),
/* 278 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _DatasetsPublication = __webpack_require__(275);

var _DatasetsPublication2 = _interopRequireDefault(_DatasetsPublication);

var _OrganizationDatasets = __webpack_require__(693);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var OrganizationDatasets = function OrganizationDatasets(_ref) {
  var published = _ref.published,
      notPublishedYet = _ref.notPublishedYet,
      publishedByOthers = _ref.publishedByOthers,
      _update = _ref.update,
      organizationId = _ref.organizationId;

  return _react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(_DatasetsPublication2.default, { datasets: notPublishedYet, organizationId: organizationId, title: 'Données en attente de publication', status: 'error', update: function update() {
        return _update();
      } }),
    _react2.default.createElement(_DatasetsPublication2.default, { datasets: published, organizationId: organizationId, title: 'Données publiées', status: 'success' }),
    _react2.default.createElement(_DatasetsPublication2.default, { datasets: publishedByOthers, organizationId: organizationId, title: 'Données publiées par une autre organisation', status: 'warning' }),
    _react2.default.createElement(
      'div',
      { className: _OrganizationDatasets.previousPage },
      _react2.default.createElement(
        _reactRouter.Link,
        { to: '/publication/' + organizationId },
        _react2.default.createElement('i', { className: 'arrow left icon' }),
        ' retour'
      )
    )
  );
};

exports.default = OrganizationDatasets;

/***/ }),
/* 279 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = PureOrganization;

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _Layout = __webpack_require__(51);

var _Layout2 = _interopRequireDefault(_Layout);

var _ManageOrganization = __webpack_require__(277);

var _ManageOrganization2 = _interopRequireDefault(_ManageOrganization);

var _ActivateOrganization = __webpack_require__(271);

var _ActivateOrganization2 = _interopRequireDefault(_ActivateOrganization);

var _Errors = __webpack_require__(13);

var _Errors2 = _interopRequireDefault(_Errors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function PureOrganization(props) {
  var organizationDetails = props.organizationDetails,
      organization = props.organization,
      user = props.user,
      metrics = props.metrics;


  if (!user) {
    return _react2.default.createElement(_Errors2.default, { errors: ['Vous devez être authentifié pour accéder à cette page'] }); // TODO: Vous devez être authentifié
  }

  if (!organizationDetails) {
    return _react2.default.createElement(_Errors2.default, { errors: ['Cette organisation n\'existe pas sur data.gouv.fr'] }); // TODO: Cette organisation n'existe pas sur data.gouv.fr
  }

  if (!organization || !metrics) {
    return _react2.default.createElement(
      _Layout2.default,
      { user: user, organization: organizationDetails, pageTitle: organizationDetails.name, title: organizationDetails.name },
      _react2.default.createElement(_ActivateOrganization2.default, { organizationId: organizationDetails.id, onActivation: function onActivation() {
          return props.onActivation();
        } })
    );
  }

  return _react2.default.createElement(
    _Layout2.default,
    { user: user, organization: organizationDetails, pageTitle: organizationDetails.name, title: organizationDetails.name },
    _react2.default.createElement(_ManageOrganization2.default, props)
  );
}

/***/ }),
/* 280 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _OrganizationMetrics = __webpack_require__(694);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var OrganizationMetrics = function OrganizationMetrics(_ref) {
  var organizationId = _ref.organizationId,
      metrics = _ref.metrics;
  var published = metrics.published,
      notPublishedYet = metrics.notPublishedYet,
      publishedByOthers = metrics.publishedByOthers;


  return _react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(
      'p',
      null,
      _react2.default.createElement(
        'strong',
        null,
        published
      ),
      ' jeux de donn\xE9es sont ',
      _react2.default.createElement(
        'strong',
        null,
        'publi\xE9s et accessibles'
      ),
      ' sur ',
      _react2.default.createElement(
        'a',
        { href: 'https://data.gouv.fr' },
        'data.gouv.fr'
      )
    ),
    _react2.default.createElement(
      'p',
      null,
      _react2.default.createElement(
        'strong',
        null,
        notPublishedYet
      ),
      ' jeux de donn\xE9es sont ',
      _react2.default.createElement(
        'strong',
        null,
        'en attente de publication'
      )
    ),
    _react2.default.createElement(
      'p',
      null,
      _react2.default.createElement(
        'strong',
        null,
        publishedByOthers
      ),
      ' jeux de donn\xE9es sont ',
      _react2.default.createElement(
        'strong',
        null,
        'publi\xE9s par d\'autres producteurs'
      )
    ),
    _react2.default.createElement(
      _reactRouter.Link,
      { className: _OrganizationMetrics.link, to: '/publication/' + organizationId + '/datasets' },
      'Publier des donn\xE9es'
    )
  );
};

exports.default = OrganizationMetrics;

/***/ }),
/* 281 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _OrganizationPreview = __webpack_require__(695);

var _OrganizationPreview2 = _interopRequireDefault(_OrganizationPreview);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var OrganizationPreview = function OrganizationPreview(_ref) {
  var organization = _ref.organization;

  var logo = organization && organization.logo ? organization.logo : '/assets/no-img.png';

  return _react2.default.createElement(
    'div',
    { className: _OrganizationPreview2.default.container },
    _react2.default.createElement(
      _reactRouter.Link,
      { className: _OrganizationPreview2.default.organization, to: '/publication/' + organization.id },
      _react2.default.createElement('img', { className: _OrganizationPreview2.default.img, src: logo, alt: organization.slug }),
      _react2.default.createElement(
        'div',
        { className: _OrganizationPreview2.default.detail },
        organization.name
      )
    )
  );
};

exports.default = OrganizationPreview;

/***/ }),
/* 282 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _OrganizationProducersPreview = __webpack_require__(696);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var OrganizationProducersPreview = function OrganizationProducersPreview(_ref) {
  var organizationId = _ref.organizationId,
      producers = _ref.producers;

  return _react2.default.createElement(
    'div',
    null,
    _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'strong',
        null,
        producers.length
      ),
      ' producteurs sont associ\xE9s \xE0 votre organisation'
    ),
    _react2.default.createElement(
      'ul',
      null,
      producers.map(function (producer, idx) {
        return _react2.default.createElement(
          'li',
          { key: idx },
          producer._id
        );
      })
    ),
    _react2.default.createElement(
      _reactRouter.Link,
      { className: _OrganizationProducersPreview.link, to: '/publication/' + organizationId + '/producers' },
      'Associer des producteurs'
    )
  );
};

exports.default = OrganizationProducersPreview;

/***/ }),
/* 283 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDocumentTitle = __webpack_require__(10);

var _reactDocumentTitle2 = _interopRequireDefault(_reactDocumentTitle);

var _OrganizationPreview = __webpack_require__(281);

var _OrganizationPreview2 = _interopRequireDefault(_OrganizationPreview);

var _Organizations = __webpack_require__(697);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Organizations = function Organizations(_ref) {
  var organizations = _ref.organizations;

  return _react2.default.createElement(
    _reactDocumentTitle2.default,
    { title: 'Vos organisations' },
    _react2.default.createElement(
      'div',
      { className: _Organizations.container },
      organizations.map(function (organization, idx) {
        return _react2.default.createElement(_OrganizationPreview2.default, { key: idx, organization: organization });
      })
    )
  );
};

exports.default = Organizations;

/***/ }),
/* 284 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactRouter = __webpack_require__(3);

var _PublishedDatasets = __webpack_require__(698);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PublishedDatasets = function PublishedDatasets(_ref) {
  var datasets = _ref.datasets;

  if (!datasets.length) return _react2.default.createElement(
    'div',
    { className: _PublishedDatasets.data },
    'Aucun jeu de donn\xE9es.'
  );
  return _react2.default.createElement(
    'div',
    null,
    datasets.map(function (dataset, idx) {
      return _react2.default.createElement(
        'div',
        { key: idx, className: _PublishedDatasets.data },
        _react2.default.createElement(
          _reactRouter.Link,
          { to: '/datasets/' + dataset._id },
          dataset.title
        ),
        _react2.default.createElement(
          'a',
          { href: dataset.remoteUrl, target: 'blank' },
          'Fiche data.gouv.fr'
        )
      );
    })
  );
};

exports.default = PublishedDatasets;

/***/ }),
/* 285 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pull2 = __webpack_require__(169);

var _pull3 = _interopRequireDefault(_pull2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _AddCatalogs = __webpack_require__(272);

var _AddCatalogs2 = _interopRequireDefault(_AddCatalogs);

var _Catalog = __webpack_require__(273);

var _Catalog2 = _interopRequireDefault(_Catalog);

var _AddButton = __webpack_require__(120);

var _AddButton2 = _interopRequireDefault(_AddButton);

var _RemoveButton = __webpack_require__(206);

var _RemoveButton2 = _interopRequireDefault(_RemoveButton);

var _Errors = __webpack_require__(13);

var _Errors2 = _interopRequireDefault(_Errors);

var _fetch = __webpack_require__(4);

var _SourceCatalogs = __webpack_require__(699);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var SourceCatalogs = function (_Component) {
  _inherits(SourceCatalogs, _Component);

  function SourceCatalogs(props) {
    _classCallCheck(this, SourceCatalogs);

    var _this = _possibleConstructorReturn(this, (SourceCatalogs.__proto__ || Object.getPrototypeOf(SourceCatalogs)).call(this, props));

    _this.state = {
      catalogs: [].concat(_toConsumableArray(_this.props.sourceCatalogs)),
      displayCatalogs: false,
      errors: []
    };
    return _this;
  }

  _createClass(SourceCatalogs, [{
    key: 'toggleCatalogList',
    value: function toggleCatalogList() {
      this.setState({ displayCatalogs: !this.state.displayCatalogs });
    }
  }, {
    key: 'addCatalog',
    value: function addCatalog(catalogId) {
      var _this2 = this;

      var catalogs = this.state.catalogs;
      var organizationId = this.props.organizationId;


      if (!catalogs.includes(catalogId)) {
        var newCatalogs = [].concat(_toConsumableArray(catalogs), [catalogId]);
        (0, _fetch.updateOrganizationAccount)(organizationId, { sourceCatalogs: newCatalogs }).then(function () {
          return _this2.setState({ catalogs: newCatalogs });
        });
      }
    }
  }, {
    key: 'removeCatalog',
    value: function removeCatalog(catalogId) {
      var _this3 = this;

      var catalogs = this.state.catalogs;
      var organizationId = this.props.organizationId;


      if (catalogs.includes(catalogId)) {
        var newCatalogs = (0, _pull3.default)(catalogs, catalogId);
        (0, _fetch.updateOrganizationAccount)(organizationId, { sourceCatalogs: newCatalogs }).then(function () {
          return _this3.setState({ catalogs: newCatalogs });
        });
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this4 = this;

      var _state = this.state,
          displayCatalogs = _state.displayCatalogs,
          catalogs = _state.catalogs,
          errors = _state.errors;


      if (errors.length) return _react2.default.createElement(_Errors2.default, { errors: errors });
      var displayCatalogsButton = _react2.default.createElement(_AddButton2.default, { action: function action() {
          return _this4.toggleCatalogList();
        }, text: 'Ajouter des catalogues' });
      var moreCatalogs = _react2.default.createElement(_AddCatalogs2.default, { sourceCatalogs: catalogs, addCatalog: function addCatalog(catalogId) {
          return _this4.addCatalog(catalogId);
        } });

      return _react2.default.createElement(
        'div',
        null,
        _react2.default.createElement(
          'div',
          { className: _SourceCatalogs.catalogsStyle },
          catalogs.map(function (id) {
            return _react2.default.createElement(
              'div',
              { key: id, className: _SourceCatalogs.catalog },
              _react2.default.createElement(_Catalog2.default, { catalogId: id, size: 'small' }),
              _react2.default.createElement(_RemoveButton2.default, { style: _SourceCatalogs.remove, action: function action() {
                  return _this4.removeCatalog(id);
                }, text: 'Supprimer' })
            );
          })
        ),
        _react2.default.createElement(
          'div',
          { className: _SourceCatalogs.buttonStyle },
          !displayCatalogs ? displayCatalogsButton : moreCatalogs
        )
      );
    }
  }]);

  return SourceCatalogs;
}(_react.Component);

exports.default = SourceCatalogs;

/***/ }),
/* 286 */,
/* 287 */,
/* 288 */,
/* 289 */,
/* 290 */,
/* 291 */,
/* 292 */,
/* 293 */,
/* 294 */,
/* 295 */,
/* 296 */,
/* 297 */,
/* 298 */,
/* 299 */,
/* 300 */,
/* 301 */,
/* 302 */,
/* 303 */,
/* 304 */,
/* 305 */,
/* 306 */,
/* 307 */,
/* 308 */,
/* 309 */,
/* 310 */,
/* 311 */,
/* 312 */,
/* 313 */,
/* 314 */,
/* 315 */,
/* 316 */,
/* 317 */,
/* 318 */,
/* 319 */,
/* 320 */,
/* 321 */,
/* 322 */,
/* 323 */,
/* 324 */,
/* 325 */,
/* 326 */,
/* 327 */,
/* 328 */,
/* 329 */,
/* 330 */,
/* 331 */,
/* 332 */,
/* 333 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".dp-QXdAc4nNRvrDIxuimJ{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;display:-webkit-box;display:-ms-flexbox;display:flex;position:relative}._3fDE3aWcb1xzLU8H56uN5_{z-index:1;background-color:#fafaf1;min-height:100vh}", ""]);

// exports
exports.locals = {
	"content": "dp-QXdAc4nNRvrDIxuimJ",
	"body": "_3fDE3aWcb1xzLU8H56uN5_"
};

/***/ }),
/* 334 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "button._3oxMmZzVmqbrKfCvk5bYIC:hover{padding:.5em;color:#2185c5;background-color:#fff;border:1px solid #2185c5}button._3oxMmZzVmqbrKfCvk5bYIC{padding:.5em;color:#fff;background-color:#2185c5;border:1px solid #fff}", ""]);

// exports
exports.locals = {
	"add": "_3oxMmZzVmqbrKfCvk5bYIC"
};

/***/ }),
/* 335 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "button._2xVvdq9E5TDAJjc2ERRzK0{padding:.5em;color:#fff;background-color:#2185c5;border:1px solid #fff}", ""]);

// exports
exports.locals = {
	"simpleButton": "_2xVvdq9E5TDAJjc2ERRzK0"
};

/***/ }),
/* 336 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "button._28cG5okx0G56AXzv1l9FU2:hover{padding:.5em;color:#ff6358;background-color:#fff;border:1px solid #ff6358}button._28cG5okx0G56AXzv1l9FU2{padding:.5em;color:#fff;background-color:#ff6358;border:1px solid #fff}", ""]);

// exports
exports.locals = {
	"remove": "_28cG5okx0G56AXzv1l9FU2"
};

/***/ }),
/* 337 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3_IpxLAE7LCncrJFIHRjNP{cursor:pointer;display:inline-block;width:300px;position:relative}._3TgrSsWGpYPUfncqPy-R2e{font-size:1.4em}.gEt3tPrtdM_6q_lNJVxkk{background-color:#fff;padding:2em 20px;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}._3Rki_jvMT0yCtVZJmmHzNc{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;margin-top:1em;font-size:11px}", ""]);

// exports
exports.locals = {
	"link": "_3_IpxLAE7LCncrJFIHRjNP",
	"title": "_3TgrSsWGpYPUfncqPy-R2e",
	"paper": "gEt3tPrtdM_6q_lNJVxkk",
	"container": "_3Rki_jvMT0yCtVZJmmHzNc"
};

/***/ }),
/* 338 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1TzZOn9DrQy3jGdnkwmxVk{color:#ffbe00}", ""]);

// exports
exports.locals = {
	"container": "_1TzZOn9DrQy3jGdnkwmxVk"
};

/***/ }),
/* 339 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2TH1dFLfM6riDY0ZFTL7yq{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center}", ""]);

// exports
exports.locals = {
	"container": "_2TH1dFLfM6riDY0ZFTL7yq"
};

/***/ }),
/* 340 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._13cls3Tpft0bssR3a-5vre{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center}", ""]);

// exports
exports.locals = {
	"container": "_13cls3Tpft0bssR3a-5vre"
};

/***/ }),
/* 341 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1GdYcI-ij54gF4t5o1Mdgm{border-radius:50%;width:4em;min-width:4em;height:4em;min-height:4em;border:4px solid #7ecefd;border:.25rem solid #7ecefd;border-top-color:#2185c5;-webkit-animation:R0oBbYdxC7Elxye2prWMa 1s infinite linear;animation:R0oBbYdxC7Elxye2prWMa 1s infinite linear;position:relative;margin:auto;display:inline-block;margin:0;padding:0;text-indent:100%;overflow:hidden}@-webkit-keyframes R0oBbYdxC7Elxye2prWMa{0%{-webkit-transform:rotate(0deg);transform:rotate(0deg)}to{-webkit-transform:rotate(1turn);transform:rotate(1turn)}}@keyframes R0oBbYdxC7Elxye2prWMa{0%{-webkit-transform:rotate(0deg);transform:rotate(0deg)}to{-webkit-transform:rotate(1turn);transform:rotate(1turn)}}", ""]);

// exports
exports.locals = {
	"circularProgress": "_1GdYcI-ij54gF4t5o1Mdgm",
	"spin": "R0oBbYdxC7Elxye2prWMa"
};

/***/ }),
/* 342 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".D78bXH_mwIdnw4TUW_4hg{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;text-align:center;color:#2185c5;margin-top:2em}.D78bXH_mwIdnw4TUW_4hg h3{font-size:4em}", ""]);

// exports
exports.locals = {
	"container": "D78bXH_mwIdnw4TUW_4hg"
};

/***/ }),
/* 343 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._30vxGeuf4AWHgPKiE3vob0{width:300px;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;text-align:left;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center}._30vxGeuf4AWHgPKiE3vob0 i{margin-right:.3em}", ""]);

// exports
exports.locals = {
	"event": "_30vxGeuf4AWHgPKiE3vob0"
};

/***/ }),
/* 344 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2HI0NCu-oyNIuf3x6jXQ7d{color:#777;font-size:12px}._2PX84dQcO0tpvxehCwhQUS{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center}", ""]);

// exports
exports.locals = {
	"count": "_2HI0NCu-oyNIuf3x6jXQ7d",
	"container": "_2PX84dQcO0tpvxehCwhQUS"
};

/***/ }),
/* 345 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._99lum3Ux3lOTcLiWC_oSu{margin-bottom:1em}._99lum3Ux3lOTcLiWC_oSu h4{font-size:1em;font-weight:400;margin-bottom:1em}._99lum3Ux3lOTcLiWC_oSu h4:first-letter{text-transform:uppercase}@media (max-width:768px){._99lum3Ux3lOTcLiWC_oSu{display:none}}", ""]);

// exports
exports.locals = {
	"container": "_99lum3Ux3lOTcLiWC_oSu"
};

/***/ }),
/* 346 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._33czYZGn_8INpupYlxVUoX{position:relative;padding:.4em .5em;margin:2px 2px 2px 0;white-space:nowrap;text-decoration:none;text-align:center;color:#2185c5;background-color:#d0ebf5;font-size:12px;overflow:hidden;border:none}._33czYZGn_8INpupYlxVUoX span{display:table-cell}._33czYZGn_8INpupYlxVUoX span:first-letter{text-transform:uppercase}._2lzU50mq4zjTkldeRocwKu{padding-left:5px;text-overflow:ellipsis;max-width:200px;overflow:hidden}._33czYZGn_8INpupYlxVUoX:hover{opacity:1;background-color:#2185c5;color:#fff}", ""]);

// exports
exports.locals = {
	"link": "_33czYZGn_8INpupYlxVUoX",
	"filterValue": "_2lzU50mq4zjTkldeRocwKu"
};

/***/ }),
/* 347 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2dyxGjSxAZqBfDuuf1rC1H{color:#2185c5;background-color:#3e454c;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;z-index:0}._XjiW2A9jxHjWuTH4YArS{height:340px;position:relative;z-index:-2;pointer-events:none}._1DCtE_uHYkFWk5_XCoQ150{padding:30px;bottom:0;width:100%;position:fixed;z-index:-1;will-change:transform;-webkit-backface-visibility:hidden;-webkit-transform:translateZ(0)}@media (max-width:768px){._XjiW2A9jxHjWuTH4YArS{height:250px}}@media (max-width:1280px){._XjiW2A9jxHjWuTH4YArS{height:340px}}._3NV5Gkq5jGSZjRrXkSvChx{margin-top:2em;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between}@media (max-width:768px){._3NV5Gkq5jGSZjRrXkSvChx{-webkit-box-orient:vertical;-webkit-box-direction:reverse;-ms-flex-direction:column-reverse;flex-direction:column-reverse;-webkit-box-align:center;-ms-flex-align:center;align-items:center}._3NV5Gkq5jGSZjRrXkSvChx p{text-align:center}}", ""]);

// exports
exports.locals = {
	"footer": "_2dyxGjSxAZqBfDuuf1rC1H",
	"space": "_XjiW2A9jxHjWuTH4YArS",
	"main": "_1DCtE_uHYkFWk5_XCoQ150",
	"info": "_3NV5Gkq5jGSZjRrXkSvChx"
};

/***/ }),
/* 348 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3pohg4LM3d2SrF3TylHLGi{background-color:#2185c5;padding:2em;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;color:#fafaf1;z-index:1}._3pohg4LM3d2SrF3TylHLGi a{color:#fafaf1}._3pohg4LM3d2SrF3TylHLGi a:focus,._3pohg4LM3d2SrF3TylHLGi a:hover{color:#fff}._6Wgzai-dR1HAsKYduSkCj{font-size:2em;font-weight:700}.hopen3NZpgiwUSvfbIR9Q{font-size:1em}.hopen3NZpgiwUSvfbIR9Q:focus,.hopen3NZpgiwUSvfbIR9Q:hover{text-decoration:underline}._2mizA57DnyprRPByNHjerV,.BhlxIIfCKJ_4LiaF0fOzc{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-ms-flex-align:center;align-items:center}.BhlxIIfCKJ_4LiaF0fOzc{margin-right:1em}.BhlxIIfCKJ_4LiaF0fOzc:focus,.BhlxIIfCKJ_4LiaF0fOzc:hover{text-decoration:underline}._25PA1uQ17btLjM1vOQyxRc{width:30px;margin-right:.3em;border-radius:60px}@media (max-width:551px){._6Wgzai-dR1HAsKYduSkCj{font-size:1em;font-weight:700}.BhlxIIfCKJ_4LiaF0fOzc{margin-right:.4em}._29m_IoCEqYWrVYeQ5H5G7_{display:none}._25PA1uQ17btLjM1vOQyxRc{width:25px;margin-left:0;margin-right:.1em}}", ""]);

// exports
exports.locals = {
	"nav": "_3pohg4LM3d2SrF3TylHLGi",
	"home": "_6Wgzai-dR1HAsKYduSkCj",
	"log": "hopen3NZpgiwUSvfbIR9Q",
	"authentification": "_2mizA57DnyprRPByNHjerV",
	"account": "BhlxIIfCKJ_4LiaF0fOzc",
	"avatar": "_25PA1uQ17btLjM1vOQyxRc",
	"logout": "_29m_IoCEqYWrVYeQ5H5G7_"
};

/***/ }),
/* 349 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3pW-sLGEKyAgbQqUIojklk{padding:20vh 8%;text-align:center}._3pW-sLGEKyAgbQqUIojklk span{line-height:4em}._3pW-sLGEKyAgbQqUIojklk h1{font-size:1.4em;margin-bottom:2em}._2BiiNWnAIs6SVfKZfowwyK button{margin:40px 20px 10px;padding:15px 20px;background-color:#fff;border:1px solid #2185c5}._2BiiNWnAIs6SVfKZfowwyK button.Uv3dao23BRxUbIN3ZDND{background-color:#2185c5;color:#fff}._3nn84sGIHdhWj5EvU61z9I{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;padding:1em}._8AhAau-Ew86NwSS83dnUV{display:block;margin-top:2em;font-size:1em}._2nFzUUqzDW3cYP3jbURJsE{background-color:#2185c5;border:1px solid #3e454c;padding:40px}._2nFzUUqzDW3cYP3jbURJsE h2{color:#fff;text-transform:uppercase}._2hyduFlLorAfdfGD58WsFz{margin-top:2em;color:#fff}._2hyduFlLorAfdfGD58WsFz:focus,._2hyduFlLorAfdfGD58WsFz:hover{color:#fff;text-decoration:underline}@media (max-width:768px){._3pW-sLGEKyAgbQqUIojklk{padding:0;margin-bottom:3em}._2BiiNWnAIs6SVfKZfowwyK{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-ms-flex-pack:distribute;justify-content:space-around;margin-top:10px}._2BiiNWnAIs6SVfKZfowwyK button{margin:0 0 10px;padding:1em}._3nn84sGIHdhWj5EvU61z9I{padding:0}}._5u9IIeUBZ-xL21eJuS5yP a{color:#fff}._5u9IIeUBZ-xL21eJuS5yP a:hover{color:#fff;text-decoration:underline}._3kqiOsXeeLWqvbjV7PAeZZ{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center}._3kqiOsXeeLWqvbjV7PAeZZ>a{margin:10px 20px}@media (max-width:551px){._3pW-sLGEKyAgbQqUIojklk h1{font-size:1em;margin:1.4em}}", ""]);

// exports
exports.locals = {
	"masthead": "_3pW-sLGEKyAgbQqUIojklk",
	"buttons": "_2BiiNWnAIs6SVfKZfowwyK",
	"inverted": "Uv3dao23BRxUbIN3ZDND",
	"paper": "_3nn84sGIHdhWj5EvU61z9I",
	"datasetLinks": "_8AhAau-Ew86NwSS83dnUV",
	"datagouv": "_2nFzUUqzDW3cYP3jbURJsE",
	"catalogLinks": "_2hyduFlLorAfdfGD58WsFz",
	"events": "_5u9IIeUBZ-xL21eJuS5yP",
	"catalogs": "_3kqiOsXeeLWqvbjV7PAeZZ"
};

/***/ }),
/* 350 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1u2V4xJI19JCiWQwZSNMQS{padding:80px 0}._3nT0HEmExuvqLhrGLPHJRG{background-color:#2185c5;border:none;padding:10px 15px;color:#fff}._3nT0HEmExuvqLhrGLPHJRG:hover{cursor:pointer;background-color:#35a2e8}._1va3dcuDB68Rqdi-T3UWeB{text-align:center}._1RRxLAT6RjiXhz-WdEZhJM{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;color:#fff}.GpofDTBcXVmXOEgy2plcx{padding:10px 15px;margin-left:1em;border:none;color:#2185c5}@media (max-width:768px){._1u2V4xJI19JCiWQwZSNMQS{padding:30px 0}}", ""]);

// exports
exports.locals = {
	"container": "_1u2V4xJI19JCiWQwZSNMQS",
	"button": "_3nT0HEmExuvqLhrGLPHJRG",
	"title": "_1va3dcuDB68Rqdi-T3UWeB",
	"form": "_1RRxLAT6RjiXhz-WdEZhJM",
	"input": "GpofDTBcXVmXOEgy2plcx"
};

/***/ }),
/* 351 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".YKOYbnULd93T3RlEHgwn5{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-align:center;-ms-flex-align:center;align-items:center;color:#2185c5;font-size:2em;margin:2em}.YKOYbnULd93T3RlEHgwn5 h1{font-size:4em}", ""]);

// exports
exports.locals = {
	"notFound": "YKOYbnULd93T3RlEHgwn5"
};

/***/ }),
/* 352 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._31ajS0YdDAbCws8GtT3HGQ{list-style:none;margin:0;padding:0;border-radius:3px;box-shadow:0 1px 1px rgba(0,0,0,.05);display:inline-block}._25lTMdedAysDiRMg5FTEE0{float:left;position:relative;background:#fff;color:#35a2e8;border:1px solid rgba(0,0,0,.15);border-bottom-width:2px;cursor:pointer}._25lTMdedAysDiRMg5FTEE0._3dlJWPC2gPvUc1mODeRXa1{color:#999;cursor:default}._25lTMdedAysDiRMg5FTEE0._3dlJWPC2gPvUc1mODeRXa1 a:hover{color:#999}._25lTMdedAysDiRMg5FTEE0:first-child{border-top-left-radius:3px;border-bottom-left-radius:3px}._25lTMdedAysDiRMg5FTEE0:last-child{border-top-right-radius:3px;border-bottom-right-radius:3px}._1z3B_zPOyXP12UFYxZB-Nj{position:relative;display:block;padding:.5em 1em;text-decoration:none;font-weight:700;color:inherit}._34Gv5eoI3KW2TCThui1b4Z{float:left;position:relative;background:#fff;color:#35a2e8;border:1px solid rgba(0,0,0,.15);border-bottom-width:2px;padding:.5em 1em;cursor:pointer}.XY2T2MYcE6naBFgRWmL7X{background:#35a2e8;border-color:#2185c5;color:#fff;z-index:1}", ""]);

// exports
exports.locals = {
	"pagination": "_31ajS0YdDAbCws8GtT3HGQ",
	"paginationElement": "_25lTMdedAysDiRMg5FTEE0",
	"disabled": "_3dlJWPC2gPvUc1mODeRXa1",
	"paginationElementLink": "_1z3B_zPOyXP12UFYxZB-Nj",
	"paginationElementBreak": "_34Gv5eoI3KW2TCThui1b4Z",
	"paginationElementActive": "XY2T2MYcE6naBFgRWmL7X"
};

/***/ }),
/* 353 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2c6-Z0KwPh-QlOJMhbQZFv{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;margin:1em;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}._2c6-Z0KwPh-QlOJMhbQZFv,._3VgdY4h-2TyzHs2Wsp2q72{display:-webkit-box;display:-ms-flexbox;display:flex}._3VgdY4h-2TyzHs2Wsp2q72{-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;padding:1em;border-bottom:2px solid;background-color:#f5f5f5;border-color:#ffbe00;-webkit-box-align:center;-ms-flex-align:center;align-items:center;font-size:1.1em}._1M8W87xVCLPhkb5PerUVnD{color:#a2a2a2}._1M8W87xVCLPhkb5PerUVnD>p{margin-top:3px}._1rr_cIZkjlmPHbmrmUKgRb{padding:0 1em;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;padding:.5em 1em;margin:.2em;border-bottom:1px solid #f5f5f5}._1rr_cIZkjlmPHbmrmUKgRb:hover{background-color:#f5f5f5}._39SWr_QgC_MH8fV71hgN8b{color:#2185c5}", ""]);

// exports
exports.locals = {
	"container": "_2c6-Z0KwPh-QlOJMhbQZFv",
	"header": "_3VgdY4h-2TyzHs2Wsp2q72",
	"subtitle": "_1M8W87xVCLPhkb5PerUVnD",
	"producers": "_1rr_cIZkjlmPHbmrmUKgRb",
	"organization": "_39SWr_QgC_MH8fV71hgN8b"
};

/***/ }),
/* 354 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3xES-vTaTtSJmXXtkqiTGn>a:hover{text-decoration:underline}", ""]);

// exports
exports.locals = {
	"item": "_3xES-vTaTtSJmXXtkqiTGn"
};

/***/ }),
/* 355 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3r_AQ64gSPhT1JhHzZzoNG{margin:.5em 1em;padding:10px;color:#fff;background-color:#2185c5;border-radius:20px;display:inline-block}._3r_AQ64gSPhT1JhHzZzoNG a,._3r_AQ64gSPhT1JhHzZzoNG a:focus,._3r_AQ64gSPhT1JhHzZzoNG a:hover{color:#fff}", ""]);

// exports
exports.locals = {
	"previousPage": "_3r_AQ64gSPhT1JhHzZzoNG"
};

/***/ }),
/* 356 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2wKuOIY30oot0n_-NoX6qC{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;margin:1em;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}._2TuCpH3frvlzUbBqWmueAo{padding:1em;border-bottom:2px solid;background-color:#f5f5f5;border-color:#21ba45;font-size:1.1em}._2TuCpH3frvlzUbBqWmueAo,._11cHBZcTsrCxjueofHQ3jn{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between}._11cHBZcTsrCxjueofHQ3jn{-webkit-box-align:center;-ms-flex-align:center;align-items:center;padding:0 1em;margin:.2em;border-bottom:1px solid #f5f5f5}._11cHBZcTsrCxjueofHQ3jn:hover{background-color:#f5f5f5}button.XU_iVHLoFeoUYSuoHSodZ{margin:.3em;padding:.5em;color:#2185c5;background-color:#fff;border:1px solid #2185c5}button.XU_iVHLoFeoUYSuoHSodZ:hover{margin:.3em;padding:.5em;color:#fff;background-color:#2185c5;border:1px solid #fff}", ""]);

// exports
exports.locals = {
	"container": "_2wKuOIY30oot0n_-NoX6qC",
	"header": "_2TuCpH3frvlzUbBqWmueAo",
	"producers": "_11cHBZcTsrCxjueofHQ3jn",
	"dissociate": "XU_iVHLoFeoUYSuoHSodZ"
};

/***/ }),
/* 357 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._17jkxEtNmfwZmUPCMuLOwI{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;margin:1em;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}._3l14RmQ_N8IPXV9sPA81uI,._17jkxEtNmfwZmUPCMuLOwI{display:-webkit-box;display:-ms-flexbox;display:flex}._3l14RmQ_N8IPXV9sPA81uI{-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;padding:1em;-webkit-box-align:center;-ms-flex-align:center;align-items:center;border-bottom:2px solid;background-color:#f5f5f5;border-color:#2185c5;font-size:1.1em}._2ZPKyJDKPsYQdQHazU7Enl{color:#a2a2a2}._2bx4xv-iRTTfM-8Czs4-aU{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;padding:0 1em;margin:.2em;border-bottom:1px solid #f5f5f5}._2bx4xv-iRTTfM-8Czs4-aU:hover{background-color:#f5f5f5}button.oWkBo_CNOmZ6wULjSEeOw{margin:.3em;padding:.5em;color:#2185c5;background-color:#fff;border:1px solid #2185c5}button.oWkBo_CNOmZ6wULjSEeOw:hover{margin:.3em;padding:.5em;color:#fff;background-color:#2185c5;border:1px solid #fff}", ""]);

// exports
exports.locals = {
	"container": "_17jkxEtNmfwZmUPCMuLOwI",
	"header": "_3l14RmQ_N8IPXV9sPA81uI",
	"subtitle": "_2ZPKyJDKPsYQdQHazU7Enl",
	"producers": "_2bx4xv-iRTTfM-8Czs4-aU",
	"associate": "oWkBo_CNOmZ6wULjSEeOw"
};

/***/ }),
/* 358 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".L7n1YLylFW8viTQRjt6Nv:active,.L7n1YLylFW8viTQRjt6Nv:focus{border-color:#85b7d9}.L7n1YLylFW8viTQRjt6Nv{margin:0;-webkit-box-flex:1;-ms-flex:1 0 auto;flex:1 0 auto;outline:0;line-height:2em;font-size:1.5em;padding:.59em 1em;background:#fff;border:1px solid rgba(34,36,38,.15);-webkit-tap-highlight-color:rgba(255,255,255,0)}.yBZnFcfrPRM5t0a3dVEhP{cursor:pointer;display:inline-block;min-height:1em;outline:0;border:none;vertical-align:baseline;padding:.8em 1.5em;font-weight:700;text-align:center;text-decoration:none;background-color:#2185c5;color:#fff}.yBZnFcfrPRM5t0a3dVEhP:hover{border-radius:0;background-color:#35a2e8;color:#fff}.PDGmiU-E9IIlMT0tB_Y_9{width:100%;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row}@media (max-width:768px){.PDGmiU-E9IIlMT0tB_Y_9{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column}}", ""]);

// exports
exports.locals = {
	"input": "L7n1YLylFW8viTQRjt6Nv",
	"button": "yBZnFcfrPRM5t0a3dVEhP",
	"wrapper": "PDGmiU-E9IIlMT0tB_Y_9"
};

/***/ }),
/* 359 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._6EWlBerG_v-W3Ga2vwcJR{background-color:#fff;padding:2em;margin-bottom:2em;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}", ""]);

// exports
exports.locals = {
	"section": "_6EWlBerG_v-W3Ga2vwcJR"
};

/***/ }),
/* 360 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2CvZFcTt9O6io20_PU6Ltp{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-ms-flex-pack:distribute;justify-content:space-around}.uQpqVhyzzTSm1YaN3oUEr{margin-right:20px}.uQpqVhyzzTSm1YaN3oUEr:last-child{margin-right:0}.uQpqVhyzzTSm1YaN3oUEr path{-webkit-transition:all .25s ease-in-out;transition:all .25s ease-in-out}.uQpqVhyzzTSm1YaN3oUEr *{pointer-events:none}.uQpqVhyzzTSm1YaN3oUEr:hover ._3t5bQFOupwMDKLVuT3Wn_V path{fill:#1da1f2}.uQpqVhyzzTSm1YaN3oUEr:hover ._2xiIWllIW3SzoVuCYATUHy path{fill:#02b875}@media (max-width:768px){._2CvZFcTt9O6io20_PU6Ltp{margin-bottom:24px}}", ""]);

// exports
exports.locals = {
	"container": "_2CvZFcTt9O6io20_PU6Ltp",
	"link": "uQpqVhyzzTSm1YaN3oUEr",
	"twitter": "_3t5bQFOupwMDKLVuT3Wn_V",
	"medium": "_2xiIWllIW3SzoVuCYATUHy"
};

/***/ }),
/* 361 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3O_B1TK25oMi6mp5V9BVHL{font-size:64px;font-size:4rem;line-height:64px;line-height:4rem}._215_X6h4BPJLz_UhYucif7{font-size:12.8px;font-size:.8rem;line-height:12.8px;line-height:.8rem}.jiW9zBRzhWvgWXpiYYvK_{font-weight:300}._3l91OYelPe0FyZdzrD06qi{font-size:32px;font-size:2rem;line-height:32px;line-height:2rem;font-weight:300}._3HlyohNT9-SbCNL8dmCkb2{text-align:center}._2EMi3tans4HIPbS7Mbw-nP{color:#21ba45}._36Jo6vZtvmwzwIxNEngWF8{color:#ffbe00}._241QTTdA5VBN4aG_I3n98Y{color:#ff6358}", ""]);

// exports
exports.locals = {
	"large": "_3O_B1TK25oMi6mp5V9BVHL",
	"small": "_215_X6h4BPJLz_UhYucif7",
	"medium": "jiW9zBRzhWvgWXpiYYvK_",
	"defaultLabel": "_3l91OYelPe0FyZdzrD06qi",
	"container": "_3HlyohNT9-SbCNL8dmCkb2",
	"success": "_2EMi3tans4HIPbS7Mbw-nP",
	"warning": "_36Jo6vZtvmwzwIxNEngWF8",
	"error": "_241QTTdA5VBN4aG_I3n98Y"
};

/***/ }),
/* 362 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1bL8Po_sZlqxTXBQj0UCFL{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-align:center;-ms-flex-align:center;align-items:center;max-width:200px;position:absolute;top:90px;left:50%;-webkit-transform:translateX(-50%);transform:translateX(-50%)}._1txwFQn3iGtTqY5QbrL6ty{max-height:120px;max-width:200px;border-radius:60px}._2dvJq9acSiW3pH9w_VaK8c{text-align:center;padding:0 0 1em;color:#000;font-size:19.2px;font-size:1.2rem}._2dvJq9acSiW3pH9w_VaK8c:hover{color:#000}@media (max-width:768px){._1bL8Po_sZlqxTXBQj0UCFL{padding:0}}", ""]);

// exports
exports.locals = {
	"section": "_1bL8Po_sZlqxTXBQj0UCFL",
	"img": "_1txwFQn3iGtTqY5QbrL6ty",
	"detail": "_2dvJq9acSiW3pH9w_VaK8c"
};

/***/ }),
/* 363 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1BTSrk4gKxA7GqkY-wluD9,._1L7PpERdPquBy5oqnuJQVE,._2SWMAPo2ipywSg2sWl94Tt,._2Tlt0H3W4PgSLCWKBUePNW,._3GmE0bFMRNlyPhhUzUIP6B,._3kg9qJfIULpZQw5_tJqk73,._3srFEnZxtYo1Q5nZINSbDU,._3ur-PJw94gtph4yBJR4PV1,._3ur-PJw94gtph4yBJR4PV1>canvas,._3ur-PJw94gtph4yBJR4PV1>svg{position:absolute;left:0;top:0}._2I6il02Grxfl4PPOVNJNQ6{overflow:hidden}._3GmE0bFMRNlyPhhUzUIP6B,._3kg9qJfIULpZQw5_tJqk73,._3srFEnZxtYo1Q5nZINSbDU{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-user-drag:none}._1LrJt6f3PV4N39JjoA3g_4 ._3srFEnZxtYo1Q5nZINSbDU{image-rendering:-webkit-optimize-contrast}._1LrJt6f3PV4N39JjoA3g_4 ._1BTSrk4gKxA7GqkY-wluD9{width:1600px;height:1600px;-webkit-transform-origin:0 0}._3GmE0bFMRNlyPhhUzUIP6B,._3kg9qJfIULpZQw5_tJqk73{display:block}._2I6il02Grxfl4PPOVNJNQ6 ._6bkNCvEGb918TZSFxLZFd img,._2I6il02Grxfl4PPOVNJNQ6 ._13lLZT0wJs01YkZ5ZDCeMU svg,._2I6il02Grxfl4PPOVNJNQ6 ._32_VT3jS_iiVD55eyA0cui img,._2I6il02Grxfl4PPOVNJNQ6 .JLm8ZGclGH1QWHgQ3IGhp img,._2I6il02Grxfl4PPOVNJNQ6 img._2Tlt0H3W4PgSLCWKBUePNW{max-width:none!important}._2I6il02Grxfl4PPOVNJNQ6.jvQ7nscR1ecUaGgnu4EvR{-ms-touch-action:pan-x pan-y;touch-action:pan-x pan-y}._2I6il02Grxfl4PPOVNJNQ6._2HG5anpdm5w2eFJv6kz6Qv{-ms-touch-action:pinch-zoom}._2I6il02Grxfl4PPOVNJNQ6._2HG5anpdm5w2eFJv6kz6Qv.jvQ7nscR1ecUaGgnu4EvR{-ms-touch-action:none;touch-action:none}._3srFEnZxtYo1Q5nZINSbDU{-webkit-filter:inherit;filter:inherit;visibility:hidden}.T89_2o85a2_xipHgct9S-{visibility:inherit}._2SWMAPo2ipywSg2sWl94Tt{width:0;height:0;box-sizing:border-box;z-index:800}._13lLZT0wJs01YkZ5ZDCeMU svg{-moz-user-select:none}._3ur-PJw94gtph4yBJR4PV1{z-index:400}._32_VT3jS_iiVD55eyA0cui{z-index:200}._13lLZT0wJs01YkZ5ZDCeMU{z-index:400}.JLm8ZGclGH1QWHgQ3IGhp{z-index:500}._6bkNCvEGb918TZSFxLZFd{z-index:600}._2nBcVC63MU4nx0jOkljcl3{z-index:650}._3Z-lK_FhHBuEhdmDw9smlP{z-index:700}._2yQnvNrghhaIRnUlEoFsWt canvas{z-index:100}._2yQnvNrghhaIRnUlEoFsWt svg{z-index:200}._37ctC3ivXm9e0LcrgqCqQw{width:1px;height:1px}._1u_Xx2WT7Rtau_BrinlGuV{behavior:url(#default#VML);display:inline-block;position:absolute}._2EO5gXfi6zF452xzH9hU0j{position:relative;z-index:800;pointer-events:visiblePainted;pointer-events:auto}._2ZNnK6pvl-2_uShsmGwrQg,._38UW7OroLsdIUlNz0S98Rn{position:absolute;z-index:1000;pointer-events:none}._2ZNnK6pvl-2_uShsmGwrQg{top:0}._2JEQgjgsO8Ngd5ZGnH8tsF{right:0}._38UW7OroLsdIUlNz0S98Rn{bottom:0}._1yIyYoabTvr2aXs-hyeKjq{left:0}._2EO5gXfi6zF452xzH9hU0j{float:left;clear:both}._2JEQgjgsO8Ngd5ZGnH8tsF ._2EO5gXfi6zF452xzH9hU0j{float:right}._2ZNnK6pvl-2_uShsmGwrQg ._2EO5gXfi6zF452xzH9hU0j{margin-top:10px}._38UW7OroLsdIUlNz0S98Rn ._2EO5gXfi6zF452xzH9hU0j{margin-bottom:10px}._1yIyYoabTvr2aXs-hyeKjq ._2EO5gXfi6zF452xzH9hU0j{margin-left:10px}._2JEQgjgsO8Ngd5ZGnH8tsF ._2EO5gXfi6zF452xzH9hU0j{margin-right:10px}._21MwnckRgJgGZeYxNSGe_K ._3srFEnZxtYo1Q5nZINSbDU{will-change:opacity}._21MwnckRgJgGZeYxNSGe_K .EsdfKen4FVR73yQKrWDzb{opacity:0;-webkit-transition:opacity .2s linear;transition:opacity .2s linear}._21MwnckRgJgGZeYxNSGe_K ._2yQnvNrghhaIRnUlEoFsWt .EsdfKen4FVR73yQKrWDzb{opacity:1}.nSMjVl-3FsNiD2VA-TbYU{-webkit-transform-origin:0 0;transform-origin:0 0}._31TpfSInIDRUkvI0kOZ4WD .nSMjVl-3FsNiD2VA-TbYU{will-change:transform;-webkit-transition:-webkit-transform .25s cubic-bezier(0,0,.25,1);transition:-webkit-transform .25s cubic-bezier(0,0,.25,1);transition:transform .25s cubic-bezier(0,0,.25,1);transition:transform .25s cubic-bezier(0,0,.25,1),-webkit-transform .25s cubic-bezier(0,0,.25,1)}._1CD4RSkJ5qZttlUYaoyIFO ._3srFEnZxtYo1Q5nZINSbDU,._31TpfSInIDRUkvI0kOZ4WD ._3srFEnZxtYo1Q5nZINSbDU{-webkit-transition:none;transition:none}._31TpfSInIDRUkvI0kOZ4WD ._3BeaLSMNGo-P66WbOF0XIG{visibility:hidden}._31GueCZIGAA-c7JpGio9J3{cursor:pointer}._270wwfWbxyf7_tCd720T{cursor:-webkit-grab;cursor:-moz-grab}._33Pe9ybsNOCrXSGhqjvJjk,._33Pe9ybsNOCrXSGhqjvJjk ._31GueCZIGAA-c7JpGio9J3{cursor:crosshair}._2EO5gXfi6zF452xzH9hU0j,._3Z-lK_FhHBuEhdmDw9smlP{cursor:auto}.bXAsUXmQNUGdMUhNYTq69 ._270wwfWbxyf7_tCd720T,.bXAsUXmQNUGdMUhNYTq69 ._270wwfWbxyf7_tCd720T ._31GueCZIGAA-c7JpGio9J3,.bXAsUXmQNUGdMUhNYTq69 .l2tkumGP2H1KrnOQkAs0J{cursor:move;cursor:-webkit-grabbing;cursor:-moz-grabbing}._1BTSrk4gKxA7GqkY-wluD9,._2Tlt0H3W4PgSLCWKBUePNW,._3GmE0bFMRNlyPhhUzUIP6B,._3kg9qJfIULpZQw5_tJqk73,._3ur-PJw94gtph4yBJR4PV1>svg path{pointer-events:none}._2Tlt0H3W4PgSLCWKBUePNW._31GueCZIGAA-c7JpGio9J3,._3kg9qJfIULpZQw5_tJqk73._31GueCZIGAA-c7JpGio9J3,._3ur-PJw94gtph4yBJR4PV1>svg path._31GueCZIGAA-c7JpGio9J3{pointer-events:visiblePainted;pointer-events:auto}._2I6il02Grxfl4PPOVNJNQ6{background:#ddd;outline:0}._2I6il02Grxfl4PPOVNJNQ6 a{color:#0078a8}._2I6il02Grxfl4PPOVNJNQ6 a._2dwGAmYwAGauU2-LsLW17O{outline:2px solid orange}._2SWMAPo2ipywSg2sWl94Tt{border:2px dotted #38f;background:hsla(0,0%,100%,.5)}._2I6il02Grxfl4PPOVNJNQ6{font:12px/1.5 Helvetica Neue,Arial,Helvetica,sans-serif}._3KHOMpKrjTe4IUaFzaSUMm{box-shadow:0 1px 5px rgba(0,0,0,.65);border-radius:4px}._3KHOMpKrjTe4IUaFzaSUMm a,._3KHOMpKrjTe4IUaFzaSUMm a:hover{background-color:#fff;border-bottom:1px solid #ccc;width:26px;height:26px;line-height:26px;display:block;text-align:center;text-decoration:none;color:#000}._3KHOMpKrjTe4IUaFzaSUMm a,._31OPAwUfBxwMEGlHzFfv_i{background-position:50% 50%;background-repeat:no-repeat;display:block}._3KHOMpKrjTe4IUaFzaSUMm a:hover{background-color:#f4f4f4}._3KHOMpKrjTe4IUaFzaSUMm a:first-child{border-top-left-radius:4px;border-top-right-radius:4px}._3KHOMpKrjTe4IUaFzaSUMm a:last-child{border-bottom-left-radius:4px;border-bottom-right-radius:4px;border-bottom:none}._3KHOMpKrjTe4IUaFzaSUMm a._3Exw8mJK5_jgnQawAA_RL8{cursor:default;background-color:#f4f4f4;color:#bbb}._1O8b1x8R3m4-cyg2lGbiCb ._3KHOMpKrjTe4IUaFzaSUMm a{width:30px;height:30px;line-height:30px}._2DenPh3w3ZmtSBcxeg-Iic,._3Eph-2xTYP2S1svyPeEliz{font:700 18px Lucida Console,Monaco,monospace;text-indent:1px}._3Eph-2xTYP2S1svyPeEliz{font-size:20px}._1O8b1x8R3m4-cyg2lGbiCb ._2DenPh3w3ZmtSBcxeg-Iic{font-size:22px}._1O8b1x8R3m4-cyg2lGbiCb ._3Eph-2xTYP2S1svyPeEliz{font-size:24px}._1ErgqSEiohR1KuFzDjl2jh{box-shadow:0 1px 5px rgba(0,0,0,.4);background:#fff;border-radius:5px}._31OPAwUfBxwMEGlHzFfv_i{background-image:require(\"leaflet/dist/images/layers.png\");width:36px;height:36px}.bqiYuuq-lGPQUbjNl9-vE ._31OPAwUfBxwMEGlHzFfv_i{background-image:require(\"leaflet/dist/images/layers-2x.png\");background-size:26px 26px}._1O8b1x8R3m4-cyg2lGbiCb ._31OPAwUfBxwMEGlHzFfv_i{width:44px;height:44px}._1ErgqSEiohR1KuFzDjl2jh ._3wyvU2RXiWfAsSupPVqf0S,._3aGjWOfEDcqB0z0GsSwAMr ._31OPAwUfBxwMEGlHzFfv_i{display:none}._3aGjWOfEDcqB0z0GsSwAMr ._3wyvU2RXiWfAsSupPVqf0S{display:block;position:relative}._3aGjWOfEDcqB0z0GsSwAMr{padding:6px 10px 6px 6px;color:#333;background:#fff}._11xwvK38hDuEXLWGAxTinS{overflow-y:scroll;padding-right:5px}._1sSiEdfLolRvQJWJBiVQX6{margin-top:2px;position:relative;top:1px}._1ErgqSEiohR1KuFzDjl2jh label{display:block}._3Dss7lNMRJSviW5ZvjEY0y{height:0;border-top:1px solid #ddd;margin:5px -10px 5px -6px}._3TlRcS53Sshii0JBidB_yb{background-image:require(\"leaflet/dist/images/marker-icon.png\")}._2I6il02Grxfl4PPOVNJNQ6 ._16E1MC3bbQ4tPlEXkrkLdo{background:#fff;background:hsla(0,0%,100%,.7);margin:0}._2Aj3_mhx-JPqz9QCE4tyur,._16E1MC3bbQ4tPlEXkrkLdo{padding:0 5px;color:#333}._16E1MC3bbQ4tPlEXkrkLdo a{text-decoration:none}._16E1MC3bbQ4tPlEXkrkLdo a:hover{text-decoration:underline}._2I6il02Grxfl4PPOVNJNQ6 ._2g96dRAOveuijceN9ohiAd,._2I6il02Grxfl4PPOVNJNQ6 ._16E1MC3bbQ4tPlEXkrkLdo{font-size:11px}._1yIyYoabTvr2aXs-hyeKjq ._2g96dRAOveuijceN9ohiAd{margin-left:5px}._38UW7OroLsdIUlNz0S98Rn ._2g96dRAOveuijceN9ohiAd{margin-bottom:5px}._2Aj3_mhx-JPqz9QCE4tyur{border:2px solid #777;border-top:none;line-height:1.1;padding:2px 5px 1px;font-size:11px;white-space:nowrap;overflow:hidden;box-sizing:border-box;background:#fff;background:hsla(0,0%,100%,.5)}._2Aj3_mhx-JPqz9QCE4tyur:not(:first-child){border-top:2px solid #777;border-bottom:none;margin-top:-2px}._2Aj3_mhx-JPqz9QCE4tyur:not(:first-child):not(:last-child){border-bottom:2px solid #777}._1O8b1x8R3m4-cyg2lGbiCb ._1ErgqSEiohR1KuFzDjl2jh,._1O8b1x8R3m4-cyg2lGbiCb ._3KHOMpKrjTe4IUaFzaSUMm,._1O8b1x8R3m4-cyg2lGbiCb ._16E1MC3bbQ4tPlEXkrkLdo{box-shadow:none}._1O8b1x8R3m4-cyg2lGbiCb ._1ErgqSEiohR1KuFzDjl2jh,._1O8b1x8R3m4-cyg2lGbiCb ._3KHOMpKrjTe4IUaFzaSUMm{border:2px solid rgba(0,0,0,.2);background-clip:padding-box}.EsdfKen4FVR73yQKrWDzb{position:absolute;text-align:center;margin-bottom:20px}._3jscoITyUXDSvDJpB74MHM{padding:1px;text-align:left;border-radius:12px}._2fVCao3njbLk6T2SEEXNoy{margin:13px 19px;line-height:1.4}._2fVCao3njbLk6T2SEEXNoy p{margin:18px 0}.SYVCSpk6yL_2un-Lri97j{width:40px;height:20px;position:absolute;left:50%;margin-left:-20px;overflow:hidden;pointer-events:none}._3FdDU0SDJ4zAZp0-40qHOV{width:17px;height:17px;padding:1px;margin:-10px auto 0;-webkit-transform:rotate(45deg);transform:rotate(45deg)}._3FdDU0SDJ4zAZp0-40qHOV,._3jscoITyUXDSvDJpB74MHM{background:#fff;color:#333;box-shadow:0 3px 14px rgba(0,0,0,.4)}._2I6il02Grxfl4PPOVNJNQ6 a._2t9p6ceKchWn_CI_IWmikK{position:absolute;top:0;right:0;padding:4px 4px 0 0;border:none;text-align:center;width:18px;height:14px;font:16px/14px Tahoma,Verdana,sans-serif;color:#c3c3c3;text-decoration:none;font-weight:700;background:transparent}._2I6il02Grxfl4PPOVNJNQ6 a._2t9p6ceKchWn_CI_IWmikK:hover{color:#999}._325Zw7E7Ox4FTulogJPmjV{overflow:auto;border-bottom:1px solid #ddd;border-top:1px solid #ddd}._1ByqEDTyTWMGn_LuWBmfXN ._3jscoITyUXDSvDJpB74MHM{zoom:1}._1ByqEDTyTWMGn_LuWBmfXN ._3FdDU0SDJ4zAZp0-40qHOV{width:24px;margin:0 auto;-ms-filter:\"progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)\";filter:progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678,M12=0.70710678,M21=-0.70710678,M22=0.70710678)}._1ByqEDTyTWMGn_LuWBmfXN .SYVCSpk6yL_2un-Lri97j{margin-top:-1px}._1ByqEDTyTWMGn_LuWBmfXN ._1ErgqSEiohR1KuFzDjl2jh,._1ByqEDTyTWMGn_LuWBmfXN ._2tgf-9KpJYVrGkWMZsIplw,._1ByqEDTyTWMGn_LuWBmfXN ._3FdDU0SDJ4zAZp0-40qHOV,._1ByqEDTyTWMGn_LuWBmfXN ._3jscoITyUXDSvDJpB74MHM{border:1px solid #999}._1fDBAnjsNyWgICnDTcqnUh{background:#fff;border:1px solid #666}._1doMdtIJRSBaV2t9PqQAzF{position:absolute;padding:6px;background-color:#fff;border:1px solid #fff;border-radius:3px;color:#222;white-space:nowrap;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,.4)}._1doMdtIJRSBaV2t9PqQAzF._3vtT49o07qrlztmcqrWJWa{cursor:pointer;pointer-events:auto}._1aPV8f510ec_V0ECLiNduv:before,._2uNaKAAD9h8qmXxfLuRpf4:before,._3gNJt1stXIc0KtqWowLO3g:before,.UjH14pjqAuo4DME4PPb8J:before{position:absolute;pointer-events:none;border:6px solid transparent;background:transparent;content:\"\"}._2uNaKAAD9h8qmXxfLuRpf4{margin-top:6px}._1aPV8f510ec_V0ECLiNduv{margin-top:-6px}._1aPV8f510ec_V0ECLiNduv:before,._2uNaKAAD9h8qmXxfLuRpf4:before{left:50%;margin-left:-6px}._1aPV8f510ec_V0ECLiNduv:before{bottom:0;margin-bottom:-12px;border-top-color:#fff}._2uNaKAAD9h8qmXxfLuRpf4:before{top:0;margin-top:-12px;margin-left:-6px;border-bottom-color:#fff}._3gNJt1stXIc0KtqWowLO3g{margin-left:-6px}.UjH14pjqAuo4DME4PPb8J{margin-left:6px}._3gNJt1stXIc0KtqWowLO3g:before,.UjH14pjqAuo4DME4PPb8J:before{top:50%;margin-top:-6px}._3gNJt1stXIc0KtqWowLO3g:before{right:0;margin-right:-12px;border-left-color:#fff}.UjH14pjqAuo4DME4PPb8J:before{left:0;margin-left:-12px;border-right-color:#fff}", ""]);

// exports
exports.locals = {
	"leaflet-pane": "_3ur-PJw94gtph4yBJR4PV1",
	"leaflet-tile": "_3srFEnZxtYo1Q5nZINSbDU",
	"leaflet-marker-icon": "_3kg9qJfIULpZQw5_tJqk73",
	"leaflet-marker-shadow": "_3GmE0bFMRNlyPhhUzUIP6B",
	"leaflet-tile-container": "_1BTSrk4gKxA7GqkY-wluD9",
	"leaflet-zoom-box": "_2SWMAPo2ipywSg2sWl94Tt",
	"leaflet-image-layer": "_2Tlt0H3W4PgSLCWKBUePNW",
	"leaflet-layer": "_1L7PpERdPquBy5oqnuJQVE",
	"leaflet-container": "_2I6il02Grxfl4PPOVNJNQ6",
	"leaflet-safari": "_1LrJt6f3PV4N39JjoA3g_4",
	"leaflet-overlay-pane": "_13lLZT0wJs01YkZ5ZDCeMU",
	"leaflet-marker-pane": "_6bkNCvEGb918TZSFxLZFd",
	"leaflet-shadow-pane": "JLm8ZGclGH1QWHgQ3IGhp",
	"leaflet-tile-pane": "_32_VT3jS_iiVD55eyA0cui",
	"leaflet-touch-zoom": "jvQ7nscR1ecUaGgnu4EvR",
	"leaflet-touch-drag": "_2HG5anpdm5w2eFJv6kz6Qv",
	"leaflet-tile-loaded": "T89_2o85a2_xipHgct9S-",
	"leaflet-tooltip-pane": "_2nBcVC63MU4nx0jOkljcl3",
	"leaflet-popup-pane": "_3Z-lK_FhHBuEhdmDw9smlP",
	"leaflet-map-pane": "_2yQnvNrghhaIRnUlEoFsWt",
	"leaflet-vml-shape": "_37ctC3ivXm9e0LcrgqCqQw",
	"lvml": "_1u_Xx2WT7Rtau_BrinlGuV",
	"leaflet-control": "_2EO5gXfi6zF452xzH9hU0j",
	"leaflet-top": "_2ZNnK6pvl-2_uShsmGwrQg",
	"leaflet-bottom": "_38UW7OroLsdIUlNz0S98Rn",
	"leaflet-right": "_2JEQgjgsO8Ngd5ZGnH8tsF",
	"leaflet-left": "_1yIyYoabTvr2aXs-hyeKjq",
	"leaflet-fade-anim": "_21MwnckRgJgGZeYxNSGe_K",
	"leaflet-popup": "EsdfKen4FVR73yQKrWDzb",
	"leaflet-zoom-animated": "nSMjVl-3FsNiD2VA-TbYU",
	"leaflet-zoom-anim": "_31TpfSInIDRUkvI0kOZ4WD",
	"leaflet-pan-anim": "_1CD4RSkJ5qZttlUYaoyIFO",
	"leaflet-zoom-hide": "_3BeaLSMNGo-P66WbOF0XIG",
	"leaflet-interactive": "_31GueCZIGAA-c7JpGio9J3",
	"leaflet-grab": "_270wwfWbxyf7_tCd720T",
	"leaflet-crosshair": "_33Pe9ybsNOCrXSGhqjvJjk",
	"leaflet-dragging": "bXAsUXmQNUGdMUhNYTq69",
	"leaflet-marker-draggable": "l2tkumGP2H1KrnOQkAs0J",
	"leaflet-active": "_2dwGAmYwAGauU2-LsLW17O",
	"leaflet-bar": "_3KHOMpKrjTe4IUaFzaSUMm",
	"leaflet-control-layers-toggle": "_31OPAwUfBxwMEGlHzFfv_i",
	"leaflet-disabled": "_3Exw8mJK5_jgnQawAA_RL8",
	"leaflet-touch": "_1O8b1x8R3m4-cyg2lGbiCb",
	"leaflet-control-zoom-in": "_2DenPh3w3ZmtSBcxeg-Iic",
	"leaflet-control-zoom-out": "_3Eph-2xTYP2S1svyPeEliz",
	"leaflet-control-layers": "_1ErgqSEiohR1KuFzDjl2jh",
	"leaflet-retina": "bqiYuuq-lGPQUbjNl9-vE",
	"leaflet-control-layers-list": "_3wyvU2RXiWfAsSupPVqf0S",
	"leaflet-control-layers-expanded": "_3aGjWOfEDcqB0z0GsSwAMr",
	"leaflet-control-layers-scrollbar": "_11xwvK38hDuEXLWGAxTinS",
	"leaflet-control-layers-selector": "_1sSiEdfLolRvQJWJBiVQX6",
	"leaflet-control-layers-separator": "_3Dss7lNMRJSviW5ZvjEY0y",
	"leaflet-default-icon-path": "_3TlRcS53Sshii0JBidB_yb",
	"leaflet-control-attribution": "_16E1MC3bbQ4tPlEXkrkLdo",
	"leaflet-control-scale-line": "_2Aj3_mhx-JPqz9QCE4tyur",
	"leaflet-control-scale": "_2g96dRAOveuijceN9ohiAd",
	"leaflet-popup-content-wrapper": "_3jscoITyUXDSvDJpB74MHM",
	"leaflet-popup-content": "_2fVCao3njbLk6T2SEEXNoy",
	"leaflet-popup-tip-container": "SYVCSpk6yL_2un-Lri97j",
	"leaflet-popup-tip": "_3FdDU0SDJ4zAZp0-40qHOV",
	"leaflet-popup-close-button": "_2t9p6ceKchWn_CI_IWmikK",
	"leaflet-popup-scrolled": "_325Zw7E7Ox4FTulogJPmjV",
	"leaflet-oldie": "_1ByqEDTyTWMGn_LuWBmfXN",
	"leaflet-control-zoom": "_2tgf-9KpJYVrGkWMZsIplw",
	"leaflet-div-icon": "_1fDBAnjsNyWgICnDTcqnUh",
	"leaflet-tooltip": "_1doMdtIJRSBaV2t9PqQAzF",
	"leaflet-clickable": "_3vtT49o07qrlztmcqrWJWa",
	"leaflet-tooltip-top": "_1aPV8f510ec_V0ECLiNduv",
	"leaflet-tooltip-bottom": "_2uNaKAAD9h8qmXxfLuRpf4",
	"leaflet-tooltip-left": "_3gNJt1stXIc0KtqWowLO3g",
	"leaflet-tooltip-right": "UjH14pjqAuo4DME4PPb8J"
};

/***/ }),
/* 364 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1nKyOQabCdEeTMTF-DqxU2{margin-bottom:2em;padding:2em;background-color:#2185c5;color:#fff}._1nKyOQabCdEeTMTF-DqxU2 a{color:#fff}", ""]);

// exports
exports.locals = {
	"container": "_1nKyOQabCdEeTMTF-DqxU2"
};

/***/ }),
/* 365 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".ghN8yY1_rbnmDXb-N14Da{-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column}._2mOChSHCOlfeuHXOrTgjCJ,.ghN8yY1_rbnmDXb-N14Da{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap}._2mOChSHCOlfeuHXOrTgjCJ{width:100%;-ms-flex-pack:distribute;justify-content:space-around;-webkit-box-align:baseline;-ms-flex-align:baseline;align-items:baseline;margin-top:2em}.ghN8yY1_rbnmDXb-N14Da>button{margin:2em;padding:15px 20px;color:#fff;background-color:#2185c5;border:1px solid}._3ybkh57T7BdPHuasEwbe8R{margin:2em}._2hHHI-l94ZP0KSzRJ7QeJA{margin:2em;padding:15px 20px;color:grey;background-color:#f2f2f2;border-color:grey}", ""]);

// exports
exports.locals = {
	"harvest": "ghN8yY1_rbnmDXb-N14Da",
	"stats": "_2mOChSHCOlfeuHXOrTgjCJ",
	"chart": "_3ybkh57T7BdPHuasEwbe8R",
	"pending": "_2hHHI-l94ZP0KSzRJ7QeJA"
};

/***/ }),
/* 366 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1Nx7zyhkDcvTl-PlR5NroU{max-width:40em;margin:2em;width:100%;text-align:center}._1Nx7zyhkDcvTl-PlR5NroU th{text-align:center}", ""]);

// exports
exports.locals = {
	"table": "_1Nx7zyhkDcvTl-PlR5NroU"
};

/***/ }),
/* 367 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".cehD4jXXALCADMBB39DrU{margin-bottom:1em}.cehD4jXXALCADMBB39DrU h2{font-size:1.2em;font-weight:400;margin-bottom:1em}._1HYFq0Y1R0O-FtIRraRpIK{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap}", ""]);

// exports
exports.locals = {
	"group": "cehD4jXXALCADMBB39DrU",
	"facets": "_1HYFq0Y1R0O-FtIRraRpIK"
};

/***/ }),
/* 368 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".-KemLvZjgTpD_onQ04rL3{padding:2em}.-KemLvZjgTpD_onQ04rL3 h2{font-size:1.2em;font-weight:400;margin-bottom:1em}._1TROOnL-N9uN0_CYRLZDrM{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-pack:distribute;justify-content:space-around;-ms-flex-wrap:wrap;flex-wrap:wrap;-webkit-box-align:center;-ms-flex-align:center;align-items:center}._1XJbOSh2z2PRLxZ0OYg46y{margin:3em}", ""]);

// exports
exports.locals = {
	"container": "-KemLvZjgTpD_onQ04rL3",
	"section": "_1TROOnL-N9uN0_CYRLZDrM",
	"chart": "_1XJbOSh2z2PRLxZ0OYg46y"
};

/***/ }),
/* 369 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1nLo19PdmsvU0wcdmR3EgW{padding-top:2em;padding-bottom:2em;background-color:#fff;padding:2em;margin-bottom:2em;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}._1nLo19PdmsvU0wcdmR3EgW h2{font-size:1.2em;font-weight:400;margin-bottom:1em}._3EX-FRag1hZre-bN2tAXFg{background-color:#fff;margin-bottom:2em;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}._8RvjDTfOht13FW3FcMfGO{padding:40px;display:block}._2OFUTutppBlMFO_MjHlrQb{text-align:center;margin-top:5em}@media (max-width:768px){._8RvjDTfOht13FW3FcMfGO{padding:0}}", ""]);

// exports
exports.locals = {
	"section": "_1nLo19PdmsvU0wcdmR3EgW",
	"sectionNoPadding": "_3EX-FRag1hZre-bN2tAXFg",
	"container": "_8RvjDTfOht13FW3FcMfGO",
	"loader": "_2OFUTutppBlMFO_MjHlrQb"
};

/***/ }),
/* 370 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3QQCIUBDuVJf18ILGS1fs_{text-align:center;padding-top:2em}._3QQCIUBDuVJf18ILGS1fs_>a{margin:1em 3em}._1kz9OJE5XQNR46To1TL5TC{text-align:center;margin-top:5em}@media (max-width:768px){._3QQCIUBDuVJf18ILGS1fs_{padding-top:0}._3QQCIUBDuVJf18ILGS1fs_>a{margin:1em}}", ""]);

// exports
exports.locals = {
	"container": "_3QQCIUBDuVJf18ILGS1fs_",
	"loader": "_1kz9OJE5XQNR46To1TL5TC"
};

/***/ }),
/* 371 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2rO6GdU7161ySO2HpVKXXh{margin:4em;padding:2em;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}._175EPdPZXEVGEDqMxFHwrF{margin:2em 0;padding:1em;background-color:#f5f5f5}", ""]);

// exports
exports.locals = {
	"container": "_2rO6GdU7161ySO2HpVKXXh",
	"results": "_175EPdPZXEVGEDqMxFHwrF"
};

/***/ }),
/* 372 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1MigpfzAiHWTziDmAYq2BB{margin:1em}._2e0xhKmBzyagnGIAOkSN5a{border-left:2px solid #2185c5;margin-left:1em;padding-left:1em}", ""]);

// exports
exports.locals = {
	"check": "_1MigpfzAiHWTziDmAYq2BB",
	"content": "_2e0xhKmBzyagnGIAOkSN5a"
};

/***/ }),
/* 373 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2sQfGASBkTHRBbNXMapG2W div{margin-top:1em}._2AlM0X3Vw_VD6RLxhKYaUe{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between}._2UZlI28l6EfA4iSBLq5Rs2{font-size:small;color:#fff;width:30%;padding:3px 2px;border-radius:3px;text-align:center}", ""]);

// exports
exports.locals = {
	"container": "_2sQfGASBkTHRBbNXMapG2W",
	"name": "_2AlM0X3Vw_VD6RLxhKYaUe",
	"tag": "_2UZlI28l6EfA4iSBLq5Rs2"
};

/***/ }),
/* 374 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".IdOw4ruhoCPJFTxgo5QCl{margin-top:2em;border-top:1px solid #000}", ""]);

// exports
exports.locals = {
	"divider": "IdOw4ruhoCPJFTxgo5QCl"
};

/***/ }),
/* 375 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".n_gPzebuUW8diOn2Qy-KY{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-pack:distribute;justify-content:space-around;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column}.n_gPzebuUW8diOn2Qy-KY button{margin-top:1em;width:50%}._16r1HL_aEYAaaJ8NmdULYP{margin-top:1em;color:#2185c5}", ""]);

// exports
exports.locals = {
	"checklist": "n_gPzebuUW8diOn2Qy-KY",
	"highlight": "_16r1HL_aEYAaaJ8NmdULYP"
};

/***/ }),
/* 376 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3zAAKAJ6PFwTvlsLuLeCSk{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;margin-bottom:4em;display:block;white-space:pre-wrap;width:60vw}.uxJu2kiwHKMAjZ6tBb3Qu{background-color:#2185c5;color:#fff;border:none;padding:5px 10px;border-bottom:1px solid;float:right}", ""]);

// exports
exports.locals = {
	"container": "_3zAAKAJ6PFwTvlsLuLeCSk",
	"action": "uxJu2kiwHKMAjZ6tBb3Qu"
};

/***/ }),
/* 377 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1_CiFVIZcuFHbyECTAhP9m{margin-bottom:3em;padding:1em;background-color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24);margin-right:2em}._2BUqeEJvPzb4DaCQJp1XO1{line-height:18px}@media (max-width:768px){._1_CiFVIZcuFHbyECTAhP9m{margin:0;margin-bottom:1em}}", ""]);

// exports
exports.locals = {
	"container": "_1_CiFVIZcuFHbyECTAhP9m",
	"list": "_2BUqeEJvPzb4DaCQJp1XO1"
};

/***/ }),
/* 378 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1GeIS3hS-BCFhjgUT9yBTJ{padding-top:2em;padding-bottom:2em;background-color:#fff;padding:2em}.z8x8JTiT5R_biCmLk-_d8{margin-bottom:2em;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}.z8x8JTiT5R_biCmLk-_d8 span{margin-left:.3em;font-weight:700;color:#7ecefd;word-wrap:break-word}.z8x8JTiT5R_biCmLk-_d8 span a{color:#7ecefd}.z8x8JTiT5R_biCmLk-_d8 span a:hover{color:#fff;text-decoration:underline;cursor:pointer}._3j1L_zR-SeKFazYry0ki6k{display:-webkit-box;display:-ms-flexbox;display:flex;padding:3em;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-align:center;-ms-flex-align:center;align-items:center}._3j1L_zR-SeKFazYry0ki6k button{margin:2em}._1_JSvrKzuQ_DVps3j8t7B4,.GSzoeTls15IvJgmuz8vyY{background-color:#2185c5}.GSzoeTls15IvJgmuz8vyY{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-ms-flex-pack:distribute;justify-content:space-around}.GSzoeTls15IvJgmuz8vyY img{width:80px;height:80px;margin-right:2em;padding:.3em;border-radius:60px;background-color:#fff}.GNFzysAZhZbhEJghrNvFw{width:70%;padding:2em;color:#fff}._3LsXp6V5xB91w4L9vt3qWp,.GNFzysAZhZbhEJghrNvFw{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column}._3LsXp6V5xB91w4L9vt3qWp{text-align:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center}._3LsXp6V5xB91w4L9vt3qWp a{margin-top:10px;color:#fff;font-size:smaller}._3LsXp6V5xB91w4L9vt3qWp a:hover{text-decoration:underline}._3VhxVXkGPmUthCCKZF_U8t{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;font-size:small}._3VhxVXkGPmUthCCKZF_U8t>div{margin-bottom:.5em;margin-right:4em}@media (max-width:760px){.z8x8JTiT5R_biCmLk-_d8 h1{font-size:large}.GSzoeTls15IvJgmuz8vyY img{width:50px;height:50px;margin-right:2em;border-radius:60px;padding:.3em;background-color:#fff}}", ""]);

// exports
exports.locals = {
	"section": "_1GeIS3hS-BCFhjgUT9yBTJ",
	"container": "z8x8JTiT5R_biCmLk-_d8",
	"stat": "_3j1L_zR-SeKFazYry0ki6k",
	"head": "_1_JSvrKzuQ_DVps3j8t7B4",
	"inspireThemeHead": "GSzoeTls15IvJgmuz8vyY",
	"resume": "GNFzysAZhZbhEJghrNvFw",
	"theme": "_3LsXp6V5xB91w4L9vt3qWp",
	"infos": "_3VhxVXkGPmUthCCKZF_U8t"
};

/***/ }),
/* 379 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3uQX9U971RdXom8O93WvAj table{margin:10px}._3uQX9U971RdXom8O93WvAj{min-width:40%;max-heigh:460px}._3uQX9U971RdXom8O93WvAj table,._3uQX9U971RdXom8O93WvAj td,._3uQX9U971RdXom8O93WvAj th{border-bottom:1px solid #d0ebf5}._3uQX9U971RdXom8O93WvAj thead{padding:10px}._3uQX9U971RdXom8O93WvAj tr:hover{background-color:#f5f5f5}._3uQX9U971RdXom8O93WvAj td,._3uQX9U971RdXom8O93WvAj th{text-align:center;padding:7px}._3uQX9U971RdXom8O93WvAj a{padding:10px}._3uQX9U971RdXom8O93WvAj a.ouqJQzy30F1WWMzh5e19j,._3uQX9U971RdXom8O93WvAj a:hover{color:#fff;background-color:#2185c5}", ""]);

// exports
exports.locals = {
	"table": "_3uQX9U971RdXom8O93WvAj",
	"reactable-current-page": "ouqJQzy30F1WWMzh5e19j"
};

/***/ }),
/* 380 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2EQALJm9ex46-ShJh0mbw7{margin:4em}._3nYOecoWSKgPpTi4g5_Ypu{display:inline-block;padding:.4em .5em;margin:2px 2px 2px 0;font-size:12px}@media (max-width:768px){._2EQALJm9ex46-ShJh0mbw7{margin:0;margin-top:10px}}", ""]);

// exports
exports.locals = {
	"searchWrapper": "_2EQALJm9ex46-ShJh0mbw7",
	"filters": "_3nYOecoWSKgPpTi4g5_Ypu"
};

/***/ }),
/* 381 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._21Q6wLzIOuTzuLW-AZFvc6{display:-webkit-box;display:-ms-flexbox;display:flex;margin:2em 4em}._1j7ALt1Wt-KpRKGpvKCwvU{-webkit-box-flex:1;-ms-flex-positive:1;flex-grow:1}.oZrakZp5udmd6kZcQDn02{text-align:center;margin-top:5em}._2kVrzEE6XcV3f5w97xLl_0{margin-left:4em}._3AmUL0XReIDjJ-d-Qk5a0f{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;margin:0 4em 2em}@media (max-width:768px){._21Q6wLzIOuTzuLW-AZFvc6{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;margin:0;margin-top:10px}}", ""]);

// exports
exports.locals = {
	"results": "_21Q6wLzIOuTzuLW-AZFvc6",
	"result": "_1j7ALt1Wt-KpRKGpvKCwvU",
	"loader": "oZrakZp5udmd6kZcQDn02",
	"counter": "_2kVrzEE6XcV3f5w97xLl_0",
	"paginationWrapper": "_3AmUL0XReIDjJ-d-Qk5a0f"
};

/***/ }),
/* 382 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".KoRl9qfpUvIXGuPMpcqZY{margin:.3em;padding:1em;border-left:1px solid #2185c5;margin-bottom:1em}.Ca52U6Mo_5V6D5L5om6lQ{float:right;text-align:right;background-color:#21ba45;color:#fff;width:40px;height:40px;-webkit-clip-path:polygon(0 0,100% 0,100% 100%);clip-path:polygon(0 0,100% 0,100% 100%)}.C4AoPckZQUwxiDxSd0Pgx{color:#2185c5;font-weight:700;font-size:15px}._2Q5D2PYbbQoUQpjzJXFj5S{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:end;-ms-flex-pack:end;justify-content:flex-end;-webkit-box-align:baseline;-ms-flex-align:baseline;align-items:baseline}._2gEKUxqyxZ5bhspCymp-DY{margin-top:.5em;color:#2185c5}._2gEKUxqyxZ5bhspCymp-DY:hover{cursor:pointer;text-decoration:underline}._2NTbLxBclKzeXz1_8MBaIq{margin-right:1em}._2NTbLxBclKzeXz1_8MBaIq:hover{text-decoration:underline}", ""]);

// exports
exports.locals = {
	"container": "KoRl9qfpUvIXGuPMpcqZY",
	"resolved": "Ca52U6Mo_5V6D5L5om6lQ",
	"title": "C4AoPckZQUwxiDxSd0Pgx",
	"action": "_2Q5D2PYbbQoUQpjzJXFj5S",
	"replies": "_2gEKUxqyxZ5bhspCymp-DY",
	"answer": "_2NTbLxBclKzeXz1_8MBaIq"
};

/***/ }),
/* 383 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "", ""]);

// exports
exports.locals = {
	"container": "_3105rgVz9p9TXHMPh_3w4n"
};

/***/ }),
/* 384 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1nnZAJMBj_Dilx8HYdKziA{min-width:50px;max-height:50px}._2Cm-UMD0p3hDCP5W2PZJpl{margin-top:1em}._1-cqiut5Wyso474rXvI6YE,._2Cm-UMD0p3hDCP5W2PZJpl{display:-webkit-box;display:-ms-flexbox;display:flex}._1oixwTcmHWl-NUIJc3ftY3{font-weight:700}._3X9QYDEhEfxz5pVpCf68vC{margin-left:1em;font-weight:100;color:#505050}._2ayDt-C-GcPvRfGGAbhqb8{margin-left:.5em}", ""]);

// exports
exports.locals = {
	"avatar": "_1nnZAJMBj_Dilx8HYdKziA",
	"message": "_2Cm-UMD0p3hDCP5W2PZJpl",
	"header": "_1-cqiut5Wyso474rXvI6YE",
	"userName": "_1oixwTcmHWl-NUIJc3ftY3",
	"postedOn": "_3X9QYDEhEfxz5pVpCf68vC",
	"content": "_2ayDt-C-GcPvRfGGAbhqb8"
};

/***/ }),
/* 385 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3zagDR4DOeRkKdhFxaQWDy{border-left:2px solid #2185c5;padding-left:10px;margin:15px}._1rczCUWIuPrrCujLVMCpHv{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;margin-top:10px;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between}._3eKexql1TZT4j6enlPvS4y{margin-bottom:10px;font-weight:600}._2crAB9UNgcqIS1hg9X5Nfj{margin:5px}._1rczCUWIuPrrCujLVMCpHv a{padding:5px}._1rczCUWIuPrrCujLVMCpHv a:hover{color:#fff;cursor:pointer;background-color:#2185c5}button._25wZ2xsPMZL1dkrT09irGC{padding:5px 10px;color:#fff;border:none;background-color:#2185c5}button._25wZ2xsPMZL1dkrT09irGC:hover{background-color:#35a2e8}button._25wZ2xsPMZL1dkrT09irGC:disabled{background-color:#f0f0f0}", ""]);

// exports
exports.locals = {
	"download": "_3zagDR4DOeRkKdhFxaQWDy",
	"container": "_1rczCUWIuPrrCujLVMCpHv",
	"title": "_3eKexql1TZT4j6enlPvS4y",
	"formats": "_2crAB9UNgcqIS1hg9X5Nfj",
	"viewerButton": "_25wZ2xsPMZL1dkrT09irGC"
};

/***/ }),
/* 386 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3bEEMXNPv-cavmdT3CVVAa{-ms-flex-wrap:wrap;flex-wrap:wrap;overflow-x:scroll}._3bEEMXNPv-cavmdT3CVVAa,._3gJQvIBaWBgB4-6GYnbpXQ{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column}._3gJQvIBaWBgB4-6GYnbpXQ{margin-bottom:50px;-webkit-box-flex:1;-ms-flex-positive:1;flex-grow:1;max-width:60%}@media (max-width:768px){._3gJQvIBaWBgB4-6GYnbpXQ{max-width:100%}}", ""]);

// exports
exports.locals = {
	"content": "_3bEEMXNPv-cavmdT3CVVAa",
	"vector": "_3gJQvIBaWBgB4-6GYnbpXQ"
};

/***/ }),
/* 387 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".Cy7JwL5KqfXG0EPFOiCh2{margin-top:1em}", ""]);

// exports
exports.locals = {
	"other": "Cy7JwL5KqfXG0EPFOiCh2"
};

/***/ }),
/* 388 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1ys9ozwdYjW4GXLCP51UKz{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap}.hhL_wZumT6DByv5KRS3l3{margin-bottom:1em}", ""]);

// exports
exports.locals = {
	"facets": "_1ys9ozwdYjW4GXLCP51UKz",
	"group": "hhL_wZumT6DByv5KRS3l3"
};

/***/ }),
/* 389 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1D4979G90BZ5KdJ6_TWGCg a:hover{text-decoration:underline}._1D4979G90BZ5KdJ6_TWGCg li{margin-top:2px}", ""]);

// exports
exports.locals = {
	"linkList": "_1D4979G90BZ5KdJ6_TWGCg"
};

/***/ }),
/* 390 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2LtaWjZmi1fdyW7rAwH9H0 pre{white-space:pre-wrap}", ""]);

// exports
exports.locals = {
	"markdown-wrapper": "_2LtaWjZmi1fdyW7rAwH9H0"
};

/***/ }),
/* 391 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._15cC645YGcZ0EVXp3ufpM3{width:100%;position:relative}._3eVjd4ST0Tzt_T3ROEh9OF{height:460px}._2dBTGX5oZGvIKC7Ol7LjuW{position:absolute;z-index:401;width:100%;height:100%;background-color:grey;opacity:.3}._2rjamo9dGh5YNffoEkEhUr{position:absolute;top:0;z-index:402;text-align:center;width:100%;background-color:#ff6358}@media (max-width:768px){._15cC645YGcZ0EVXp3ufpM3{width:100%}}", ""]);

// exports
exports.locals = {
	"container": "_15cC645YGcZ0EVXp3ufpM3",
	"map": "_3eVjd4ST0Tzt_T3ROEh9OF",
	"load": "_2dBTGX5oZGvIKC7Ol7LjuW",
	"errors": "_2rjamo9dGh5YNffoEkEhUr"
};

/***/ }),
/* 392 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".MCAo13PfD1C1na1QFtvdk{text-align:center}.MCAo13PfD1C1na1QFtvdk img{width:160px;display:block;margin-left:auto;margin-right:auto;margin:0 auto}", ""]);

// exports
exports.locals = {
	"container": "MCAo13PfD1C1na1QFtvdk"
};

/***/ }),
/* 393 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3mUE9R_WuzxQNGrZiRsVuV{width:100%;position:relative}.sYXymmbkON4Y-XT0NT0Md{margin-top:15px;height:280px}", ""]);

// exports
exports.locals = {
	"container": "_3mUE9R_WuzxQNGrZiRsVuV",
	"map": "sYXymmbkON4Y-XT0NT0Md"
};

/***/ }),
/* 394 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2lm6IzR6SeJXXN_fwY-aR1{display:-webkit-box;display:-ms-flexbox;display:flex}._2lm6IzR6SeJXXN_fwY-aR1 div{margin-bottom:5px}._15K31VWG7Zj3Ov2nU0HrKj{margin-right:4em}", ""]);

// exports
exports.locals = {
	"container": "_2lm6IzR6SeJXXN_fwY-aR1",
	"histo": "_15K31VWG7Zj3Ov2nU0HrKj"
};

/***/ }),
/* 395 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._20w87jwIsnd86kxmjbWSul img{width:280px;display:block;margin-left:auto;margin-right:auto;margin:0 auto}.Q4gSqcn4eWoTGLDCCBCRV{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center}.Q4gSqcn4eWoTGLDCCBCRV img{margin:1em;width:68px}.Q4gSqcn4eWoTGLDCCBCRV img:hover{cursor:pointer}img.LS3dAcnaL6RrvjJGVkFfk{border:2px solid #2185c5}", ""]);

// exports
exports.locals = {
	"main": "_20w87jwIsnd86kxmjbWSul",
	"list": "Q4gSqcn4eWoTGLDCCBCRV",
	"selected": "LS3dAcnaL6RrvjJGVkFfk"
};

/***/ }),
/* 396 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2P6_qqHl7yKKCff8GqLX7T{-webkit-box-flex:1;-ms-flex-positive:1;flex-grow:1}._1K0bNFzFuYgfZpFAWUJMSN{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-pack:distribute;justify-content:space-around;-webkit-box-align:center;-ms-flex-align:center;align-items:center}._1K0bNFzFuYgfZpFAWUJMSN>button{width:50%}._1K0bNFzFuYgfZpFAWUJMSN button{padding:5px 10px;color:#fff;border:none;background-color:#2185c5}._1K0bNFzFuYgfZpFAWUJMSN button:hover{background-color:#35a2e8}button._3ywk7HKwUvByQ2vjogOg5i{padding:3px 10px;border-bottom:4px solid #7ecefd}._1K0bNFzFuYgfZpFAWUJMSN .HqqOF_S5WVC1GLU8FByYr{border:none;max-width:36px;color:#fff;background-color:#ff6358}._1K0bNFzFuYgfZpFAWUJMSN .HqqOF_S5WVC1GLU8FByYr:hover{background-color:#ff7565}", ""]);

// exports
exports.locals = {
	"visualizer": "_2P6_qqHl7yKKCff8GqLX7T",
	"buttons": "_1K0bNFzFuYgfZpFAWUJMSN",
	"active": "_3ywk7HKwUvByQ2vjogOg5i",
	"closeButton": "HqqOF_S5WVC1GLU8FByYr"
};

/***/ }),
/* 397 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2cok-L1jUivmxlQRPjldPJ{margin:3em;display:-webkit-box;display:-ms-flexbox;display:flex}._3N7osFJzLceDqcHGBEx1cS{width:70%;margin-right:1em}._169OSOcS27yYd4w0grOKHz{width:30%}._1QL_W_G4N9Es4qzoIugBAS{text-align:center;margin-top:5em}._3XFoHvPSxkHolRodVBVzkL{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;margin:3em}@media (max-width:768px){._2cok-L1jUivmxlQRPjldPJ{margin:0}}@media (max-width:1200px){._2cok-L1jUivmxlQRPjldPJ{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column}._3N7osFJzLceDqcHGBEx1cS,._169OSOcS27yYd4w0grOKHz{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;width:100%}}", ""]);

// exports
exports.locals = {
	"container": "_2cok-L1jUivmxlQRPjldPJ",
	"main": "_3N7osFJzLceDqcHGBEx1cS",
	"side": "_169OSOcS27yYd4w0grOKHz",
	"loader": "_1QL_W_G4N9Es4qzoIugBAS",
	"warning": "_3XFoHvPSxkHolRodVBVzkL"
};

/***/ }),
/* 398 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".vJm3Vlug9NL4vmb6th10i{margin:2em;text-align:center}.vJm3Vlug9NL4vmb6th10i h1{margin:1em}._2n3azjtBhixpo17aejAIcT{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-ms-flex-wrap:wrap;flex-wrap:wrap}._2n3azjtBhixpo17aejAIcT iframe{margin:1em}._3c9RkBcioGPjr0-wetoL3T{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-pack:distribute;justify-content:space-around;-ms-flex-wrap:wrap;flex-wrap:wrap}", ""]);

// exports
exports.locals = {
	"events": "vJm3Vlug9NL4vmb6th10i",
	"eventsList": "_2n3azjtBhixpo17aejAIcT",
	"pastEventsList": "_3c9RkBcioGPjr0-wetoL3T"
};

/***/ }),
/* 399 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2eKlPNa7hTDuNcQPqiDsFO{margin-top:2em;text-align:center}button._39Khm7yl-9vyTJ5eQXo2_I{padding:1em 1.5em;color:#fff;background-color:#2185c5;border:1px solid #fff}", ""]);

// exports
exports.locals = {
	"msg": "_2eKlPNa7hTDuNcQPqiDsFO",
	"activate": "_39Khm7yl-9vyTJ5eQXo2_I"
};

/***/ }),
/* 400 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._66I2qlB0f3a9Po34RHpFz{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;text-align:center;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between}._66I2qlB0f3a9Po34RHpFz>a{margin:1em 3em}.d4kneLuLZNArqb2DONvJC{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;margin:1em}._2YOAV9LjSSvQRHxdWsss-e{text-align:center;margin-top:5em}._16ejGVm9Kp1ld44crc-lpg{margin-top:5px}._22ZzYQqMW9Bxnf_r6J7Cbm{padding:1em;color:#ffbe00}@media (max-width:768px){._66I2qlB0f3a9Po34RHpFz{padding-top:0}._66I2qlB0f3a9Po34RHpFz>a{margin:1em}}", ""]);

// exports
exports.locals = {
	"container": "_66I2qlB0f3a9Po34RHpFz",
	"card": "d4kneLuLZNArqb2DONvJC",
	"loader": "_2YOAV9LjSSvQRHxdWsss-e",
	"add": "_16ejGVm9Kp1ld44crc-lpg",
	"warningMsg": "_22ZzYQqMW9Bxnf_r6J7Cbm"
};

/***/ }),
/* 401 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".gQqpXPyckYIeX_WyRZ0vy{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;margin:1em}._1PwTxLGVIUCT5lNdfrT5ZB{color:grey}", ""]);

// exports
exports.locals = {
	"data": "gQqpXPyckYIeX_WyRZ0vy",
	"progress": "_1PwTxLGVIUCT5lNdfrT5ZB"
};

/***/ }),
/* 402 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._38Lo7_Oi8NWloyzCK9AFLk{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;margin:1em;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}._3g93MC5HCrXNUo5YXc37Z,._38Lo7_Oi8NWloyzCK9AFLk{display:-webkit-box;display:-ms-flexbox;display:flex}._3g93MC5HCrXNUo5YXc37Z{-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;padding:1em;border-bottom:1px solid;background-color:#f5f5f5;font-size:1.1em}._1rFNsy8nuekQ0tSEvbAP-T{border-color:#21ba45}._1Gp1DzCsDAKRpaS3zABMFy{border-color:#ffbe00}._1VyGBzbZh2aP4ijevKE2a6{border-color:#ff6358}", ""]);

// exports
exports.locals = {
	"container": "_38Lo7_Oi8NWloyzCK9AFLk",
	"header": "_3g93MC5HCrXNUo5YXc37Z",
	"success": "_1rFNsy8nuekQ0tSEvbAP-T",
	"warning": "_1Gp1DzCsDAKRpaS3zABMFy",
	"error": "_1VyGBzbZh2aP4ijevKE2a6"
};

/***/ }),
/* 403 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3pLJ_VpVZewKwbNVCyBx5r{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between}._3g0MYa5mtAh6er9kAlx9MZ:hover{cursor:pointer}._3K7E2gJAIs3RhgXyuFcr__{background-color:#2185c5;color:#fff;padding:1em;width:49%;text-align:center}button._3jutSxjcv-fixL-T_1H-6q{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:baseline;-ms-flex-align:baseline;align-items:baseline;margin:.5em 1em;padding:10px;color:#fff;border:none;background-color:#2185c5;display:inline-block}button._3jutSxjcv-fixL-T_1H-6q i{margin-left:10px}._1bA3TF5qgaUd-jpZGSncY4,._1bA3TF5qgaUd-jpZGSncY4:hover{background-color:#f5f5f5;color:grey;padding:1em;width:49%;text-align:center;cursor:default}._2slP9gxEdiz13OhujX9k2m{background-color:#2185c5;color:#fff;padding:1em;width:49%;text-align:center}._1bpKsKsVG-ZBRmzyEIGm9B{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;margin:1em}", ""]);

// exports
exports.locals = {
	"buttons": "_3pLJ_VpVZewKwbNVCyBx5r",
	"button": "_3g0MYa5mtAh6er9kAlx9MZ",
	"publishButton": "_3K7E2gJAIs3RhgXyuFcr__",
	"refresh": "_3jutSxjcv-fixL-T_1H-6q",
	"disable": "_1bA3TF5qgaUd-jpZGSncY4",
	"selection": "_2slP9gxEdiz13OhujX9k2m",
	"noData": "_1bpKsKsVG-ZBRmzyEIGm9B"
};

/***/ }),
/* 404 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._382bpj2q4QhCEvb_tppR5K{padding:60px 40px;display:block}._2j1HVbTRxKV7WVB7E5tkiX{box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24);background-color:#fff;position:absolute;top:100px;max-width:50px;border-radius:60px;left:52%}@media (max-width:768px){._382bpj2q4QhCEvb_tppR5K{padding:0;padding-top:60px}._2j1HVbTRxKV7WVB7E5tkiX{left:56%}}._2BLvzatD5MH_FSNN_W1wEI{padding-top:100px;padding-bottom:2em;background-color:#fff;margin-bottom:2em;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24)}._2BLvzatD5MH_FSNN_W1wEI h3{padding:0 1em;font-weight:400}", ""]);

// exports
exports.locals = {
	"publishing": "_382bpj2q4QhCEvb_tppR5K",
	"organizationLogo": "_2j1HVbTRxKV7WVB7E5tkiX",
	"container": "_2BLvzatD5MH_FSNN_W1wEI"
};

/***/ }),
/* 405 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, ".QRWXnj0EK9Rmf3958DzFM{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-flex:1;-ms-flex-positive:1;flex-grow:1;padding:2em}.QRWXnj0EK9Rmf3958DzFM h4{margin-top:1em;margin-bottom:.5em}._1m8SpcLJW0sCDuq6NjwEOM>div{background-color:#fafaf1;padding:1em}._1m8SpcLJW0sCDuq6NjwEOM>div p{margin-bottom:4px}._2QLUPAgm2RzSHH-b_IutT0{margin-top:2em;width:200px;padding:10px;color:#fff;background-color:#2185c5;border-radius:20px}._2QLUPAgm2RzSHH-b_IutT0 a,._2QLUPAgm2RzSHH-b_IutT0 a:focus,._2QLUPAgm2RzSHH-b_IutT0 a:hover{color:#fff}@media (max-width:768px){.QRWXnj0EK9Rmf3958DzFM{padding:.5em}._3WutywfuvEhcqWfG_3DXRh{padding:1em;text-align:center}}", ""]);

// exports
exports.locals = {
	"content": "QRWXnj0EK9Rmf3958DzFM",
	"section": "_1m8SpcLJW0sCDuq6NjwEOM",
	"previousPage": "_2QLUPAgm2RzSHH-b_IutT0",
	"organization": "_3WutywfuvEhcqWfG_3DXRh"
};

/***/ }),
/* 406 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3YFtblsr9dxEsCdqaazffF{margin:.5em 1em;padding:10px;color:#fff;background-color:#2185c5;border-radius:20px;display:inline-block}._3YFtblsr9dxEsCdqaazffF a,._3YFtblsr9dxEsCdqaazffF a:focus,._3YFtblsr9dxEsCdqaazffF a:hover{color:#fff}", ""]);

// exports
exports.locals = {
	"previousPage": "_3YFtblsr9dxEsCdqaazffF"
};

/***/ }),
/* 407 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3Abdey1hVXet1YDSnlcuV_:focus,._3Abdey1hVXet1YDSnlcuV_:hover{text-decoration:underline}", ""]);

// exports
exports.locals = {
	"link": "_3Abdey1hVXet1YDSnlcuV_"
};

/***/ }),
/* 408 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3SzAQzNWHowWN7FQnIaQMj{box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24);margin:2em;max-width:186px}._3WCZMpcGe5-oJl2JIsh-j{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;height:100%}._1FNVjaEv2JhgvINMzEQ5rg{max-height:120px;max-width:200px;margin-bottom:10px;padding:1em 1em 0}._2M31-lnt8m9VUcyvp7V0lu{color:#fff;background-color:#2185c5;font-size:16px;font-size:1rem;padding:1em;width:100%;height:100%}@media (max-width:768px){._3SzAQzNWHowWN7FQnIaQMj{-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;margin:1em}._3WCZMpcGe5-oJl2JIsh-j{text-align:center}}", ""]);

// exports
exports.locals = {
	"container": "_3SzAQzNWHowWN7FQnIaQMj",
	"organization": "_3WCZMpcGe5-oJl2JIsh-j",
	"img": "_1FNVjaEv2JhgvINMzEQ5rg",
	"detail": "_2M31-lnt8m9VUcyvp7V0lu"
};

/***/ }),
/* 409 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._3scVTmIldyrjjD2QAAv-Od:focus,._3scVTmIldyrjjD2QAAv-Od:hover{text-decoration:underline}", ""]);

// exports
exports.locals = {
	"link": "_3scVTmIldyrjjD2QAAv-Od"
};

/***/ }),
/* 410 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._1m9M-8naSeX5KNZbfFvRzg{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:start;-ms-flex-pack:start;justify-content:flex-start;-ms-flex-wrap:wrap;flex-wrap:wrap;margin:20px}@media (max-width:768px){._1m9M-8naSeX5KNZbfFvRzg{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:start;-ms-flex-pack:start;justify-content:flex-start;-ms-flex-wrap:wrap;flex-wrap:wrap;margin:10px}}", ""]);

// exports
exports.locals = {
	"container": "_1m9M-8naSeX5KNZbfFvRzg"
};

/***/ }),
/* 411 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2Gd3m03lTOcvfO2QL0hSkX{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;margin:1em}", ""]);

// exports
exports.locals = {
	"data": "_2Gd3m03lTOcvfO2QL0hSkX"
};

/***/ }),
/* 412 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(1)();
// imports


// module
exports.push([module.i, "._2LTzG92ApdoINReXhcAGbQ{display:-webkit-box;display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;-webkit-box-pack:start;-ms-flex-pack:start;justify-content:flex-start;padding-bottom:2em;margin-bottom:2em;border-bottom:1px solid #d0d0d0}._2LTzG92ApdoINReXhcAGbQ a{margin:.5em}.KkD4QQY3FkdPS6gkKHZEF{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column}._1sh5f_UGJrg9-loUrCt5ZM{width:300px;margin:0 7px;padding:.5em}._17jd-r3ciwCJU4171gBrOK{margin:.5em}", ""]);

// exports
exports.locals = {
	"catalogsStyle": "_2LTzG92ApdoINReXhcAGbQ",
	"catalog": "KkD4QQY3FkdPS6gkKHZEF",
	"remove": "_1sh5f_UGJrg9-loUrCt5ZM",
	"buttonStyle": "_17jd-r3ciwCJU4171gBrOK"
};

/***/ }),
/* 413 */,
/* 414 */,
/* 415 */,
/* 416 */,
/* 417 */,
/* 418 */,
/* 419 */,
/* 420 */,
/* 421 */,
/* 422 */,
/* 423 */,
/* 424 */,
/* 425 */,
/* 426 */,
/* 427 */,
/* 428 */,
/* 429 */,
/* 430 */,
/* 431 */,
/* 432 */,
/* 433 */,
/* 434 */,
/* 435 */,
/* 436 */,
/* 437 */,
/* 438 */
/***/ (function(module, exports, __webpack_require__) {

var baseIndexOf = __webpack_require__(143);

/**
 * A specialized version of `_.includes` for arrays without support for
 * specifying an index to search from.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludes(array, value) {
  var length = array == null ? 0 : array.length;
  return !!length && baseIndexOf(array, value, 0) > -1;
}

module.exports = arrayIncludes;


/***/ }),
/* 439 */
/***/ (function(module, exports) {

/**
 * This function is like `arrayIncludes` except that it accepts a comparator.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @param {Function} comparator The comparator invoked per element.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludesWith(array, value, comparator) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (comparator(value, array[index])) {
      return true;
    }
  }
  return false;
}

module.exports = arrayIncludesWith;


/***/ }),
/* 440 */,
/* 441 */,
/* 442 */,
/* 443 */
/***/ (function(module, exports, __webpack_require__) {

var baseEach = __webpack_require__(37);

/**
 * The base implementation of `_.filter` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function baseFilter(collection, predicate) {
  var result = [];
  baseEach(collection, function(value, index, collection) {
    if (predicate(value, index, collection)) {
      result.push(value);
    }
  });
  return result;
}

module.exports = baseFilter;


/***/ }),
/* 444 */,
/* 445 */,
/* 446 */,
/* 447 */
/***/ (function(module, exports) {

/**
 * This function is like `baseIndexOf` except that it accepts a comparator.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @param {Function} comparator The comparator invoked per element.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOfWith(array, value, fromIndex, comparator) {
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (comparator(array[index], value)) {
      return index;
    }
  }
  return -1;
}

module.exports = baseIndexOfWith;


/***/ }),
/* 448 */,
/* 449 */,
/* 450 */,
/* 451 */
/***/ (function(module, exports) {

/**
 * The base implementation of `_.isNaN` without support for number objects.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
 */
function baseIsNaN(value) {
  return value !== value;
}

module.exports = baseIsNaN;


/***/ }),
/* 452 */,
/* 453 */,
/* 454 */,
/* 455 */,
/* 456 */
/***/ (function(module, exports, __webpack_require__) {

var baseEach = __webpack_require__(37),
    isArrayLike = __webpack_require__(23);

/**
 * The base implementation of `_.map` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function baseMap(collection, iteratee) {
  var index = -1,
      result = isArrayLike(collection) ? Array(collection.length) : [];

  baseEach(collection, function(value, key, collection) {
    result[++index] = iteratee(value, key, collection);
  });
  return result;
}

module.exports = baseMap;


/***/ }),
/* 457 */,
/* 458 */,
/* 459 */
/***/ (function(module, exports, __webpack_require__) {

var arrayMap = __webpack_require__(55),
    baseIteratee = __webpack_require__(21),
    baseMap = __webpack_require__(456),
    baseSortBy = __webpack_require__(471),
    baseUnary = __webpack_require__(97),
    compareMultiple = __webpack_require__(484),
    identity = __webpack_require__(40);

/**
 * The base implementation of `_.orderBy` without param guards.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function[]|Object[]|string[]} iteratees The iteratees to sort by.
 * @param {string[]} orders The sort orders of `iteratees`.
 * @returns {Array} Returns the new sorted array.
 */
function baseOrderBy(collection, iteratees, orders) {
  var index = -1;
  iteratees = arrayMap(iteratees.length ? iteratees : [identity], baseUnary(baseIteratee));

  var result = baseMap(collection, function(value, key, collection) {
    var criteria = arrayMap(iteratees, function(iteratee) {
      return iteratee(value);
    });
    return { 'criteria': criteria, 'index': ++index, 'value': value };
  });

  return baseSortBy(result, function(object, other) {
    return compareMultiple(object, other, orders);
  });
}

module.exports = baseOrderBy;


/***/ }),
/* 460 */,
/* 461 */,
/* 462 */,
/* 463 */,
/* 464 */
/***/ (function(module, exports, __webpack_require__) {

var arrayMap = __webpack_require__(55),
    baseIndexOf = __webpack_require__(143),
    baseIndexOfWith = __webpack_require__(447),
    baseUnary = __webpack_require__(97),
    copyArray = __webpack_require__(146);

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * The base implementation of `_.pullAllBy` without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to remove.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns `array`.
 */
function basePullAll(array, values, iteratee, comparator) {
  var indexOf = comparator ? baseIndexOfWith : baseIndexOf,
      index = -1,
      length = values.length,
      seen = array;

  if (array === values) {
    values = copyArray(values);
  }
  if (iteratee) {
    seen = arrayMap(array, baseUnary(iteratee));
  }
  while (++index < length) {
    var fromIndex = 0,
        value = values[index],
        computed = iteratee ? iteratee(value) : value;

    while ((fromIndex = indexOf(seen, computed, fromIndex, comparator)) > -1) {
      if (seen !== array) {
        splice.call(seen, fromIndex, 1);
      }
      splice.call(array, fromIndex, 1);
    }
  }
  return array;
}

module.exports = basePullAll;


/***/ }),
/* 465 */
/***/ (function(module, exports, __webpack_require__) {

var baseUnset = __webpack_require__(144),
    isIndex = __webpack_require__(39);

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * The base implementation of `_.pullAt` without support for individual
 * indexes or capturing the removed elements.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {number[]} indexes The indexes of elements to remove.
 * @returns {Array} Returns `array`.
 */
function basePullAt(array, indexes) {
  var length = array ? indexes.length : 0,
      lastIndex = length - 1;

  while (length--) {
    var index = indexes[length];
    if (length == lastIndex || index !== previous) {
      var previous = index;
      if (isIndex(index)) {
        splice.call(array, index, 1);
      } else {
        baseUnset(array, index);
      }
    }
  }
  return array;
}

module.exports = basePullAt;


/***/ }),
/* 466 */,
/* 467 */,
/* 468 */,
/* 469 */,
/* 470 */
/***/ (function(module, exports, __webpack_require__) {

var baseEach = __webpack_require__(37);

/**
 * The base implementation of `_.some` without support for iteratee shorthands.
 *
 * @private
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function baseSome(collection, predicate) {
  var result;

  baseEach(collection, function(value, index, collection) {
    result = predicate(value, index, collection);
    return !result;
  });
  return !!result;
}

module.exports = baseSome;


/***/ }),
/* 471 */
/***/ (function(module, exports) {

/**
 * The base implementation of `_.sortBy` which uses `comparer` to define the
 * sort order of `array` and replaces criteria objects with their corresponding
 * values.
 *
 * @private
 * @param {Array} array The array to sort.
 * @param {Function} comparer The function to define sort order.
 * @returns {Array} Returns `array`.
 */
function baseSortBy(array, comparer) {
  var length = array.length;

  array.sort(comparer);
  while (length--) {
    array[length] = array[length].value;
  }
  return array;
}

module.exports = baseSortBy;


/***/ }),
/* 472 */,
/* 473 */,
/* 474 */
/***/ (function(module, exports, __webpack_require__) {

var SetCache = __webpack_require__(133),
    arrayIncludes = __webpack_require__(438),
    arrayIncludesWith = __webpack_require__(439),
    cacheHas = __webpack_require__(145),
    createSet = __webpack_require__(491),
    setToArray = __webpack_require__(60);

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * The base implementation of `_.uniqBy` without support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns the new duplicate free array.
 */
function baseUniq(array, iteratee, comparator) {
  var index = -1,
      includes = arrayIncludes,
      length = array.length,
      isCommon = true,
      result = [],
      seen = result;

  if (comparator) {
    isCommon = false;
    includes = arrayIncludesWith;
  }
  else if (length >= LARGE_ARRAY_SIZE) {
    var set = iteratee ? null : createSet(array);
    if (set) {
      return setToArray(set);
    }
    isCommon = false;
    includes = cacheHas;
    seen = new SetCache;
  }
  else {
    seen = iteratee ? [] : result;
  }
  outer:
  while (++index < length) {
    var value = array[index],
        computed = iteratee ? iteratee(value) : value;

    value = (comparator || value !== 0) ? value : 0;
    if (isCommon && computed === computed) {
      var seenIndex = seen.length;
      while (seenIndex--) {
        if (seen[seenIndex] === computed) {
          continue outer;
        }
      }
      if (iteratee) {
        seen.push(computed);
      }
      result.push(value);
    }
    else if (!includes(seen, computed, comparator)) {
      if (seen !== result) {
        seen.push(computed);
      }
      result.push(value);
    }
  }
  return result;
}

module.exports = baseUniq;


/***/ }),
/* 475 */,
/* 476 */,
/* 477 */,
/* 478 */,
/* 479 */,
/* 480 */,
/* 481 */,
/* 482 */,
/* 483 */
/***/ (function(module, exports, __webpack_require__) {

var isSymbol = __webpack_require__(41);

/**
 * Compares values to sort them in ascending order.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {number} Returns the sort order indicator for `value`.
 */
function compareAscending(value, other) {
  if (value !== other) {
    var valIsDefined = value !== undefined,
        valIsNull = value === null,
        valIsReflexive = value === value,
        valIsSymbol = isSymbol(value);

    var othIsDefined = other !== undefined,
        othIsNull = other === null,
        othIsReflexive = other === other,
        othIsSymbol = isSymbol(other);

    if ((!othIsNull && !othIsSymbol && !valIsSymbol && value > other) ||
        (valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol) ||
        (valIsNull && othIsDefined && othIsReflexive) ||
        (!valIsDefined && othIsReflexive) ||
        !valIsReflexive) {
      return 1;
    }
    if ((!valIsNull && !valIsSymbol && !othIsSymbol && value < other) ||
        (othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol) ||
        (othIsNull && valIsDefined && valIsReflexive) ||
        (!othIsDefined && valIsReflexive) ||
        !othIsReflexive) {
      return -1;
    }
  }
  return 0;
}

module.exports = compareAscending;


/***/ }),
/* 484 */
/***/ (function(module, exports, __webpack_require__) {

var compareAscending = __webpack_require__(483);

/**
 * Used by `_.orderBy` to compare multiple properties of a value to another
 * and stable sort them.
 *
 * If `orders` is unspecified, all values are sorted in ascending order. Otherwise,
 * specify an order of "desc" for descending or "asc" for ascending sort order
 * of corresponding values.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {boolean[]|string[]} orders The order to sort by for each property.
 * @returns {number} Returns the sort order indicator for `object`.
 */
function compareMultiple(object, other, orders) {
  var index = -1,
      objCriteria = object.criteria,
      othCriteria = other.criteria,
      length = objCriteria.length,
      ordersLength = orders.length;

  while (++index < length) {
    var result = compareAscending(objCriteria[index], othCriteria[index]);
    if (result) {
      if (index >= ordersLength) {
        return result;
      }
      var order = orders[index];
      return result * (order == 'desc' ? -1 : 1);
    }
  }
  // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
  // that causes it, under certain circumstances, to provide the same value for
  // `object` and `other`. See https://github.com/jashkenas/underscore/pull/1247
  // for more details.
  //
  // This also ensures a stable sort in V8 and other engines.
  // See https://bugs.chromium.org/p/v8/issues/detail?id=90 for more details.
  return object.index - other.index;
}

module.exports = compareMultiple;


/***/ }),
/* 485 */,
/* 486 */,
/* 487 */,
/* 488 */,
/* 489 */,
/* 490 */
/***/ (function(module, exports, __webpack_require__) {

var baseIteratee = __webpack_require__(21),
    isArrayLike = __webpack_require__(23),
    keys = __webpack_require__(25);

/**
 * Creates a `_.find` or `_.findLast` function.
 *
 * @private
 * @param {Function} findIndexFunc The function to find the collection index.
 * @returns {Function} Returns the new find function.
 */
function createFind(findIndexFunc) {
  return function(collection, predicate, fromIndex) {
    var iterable = Object(collection);
    if (!isArrayLike(collection)) {
      var iteratee = baseIteratee(predicate, 3);
      collection = keys(collection);
      predicate = function(key) { return iteratee(iterable[key], key, iterable); };
    }
    var index = findIndexFunc(collection, predicate, fromIndex);
    return index > -1 ? iterable[iteratee ? collection[index] : index] : undefined;
  };
}

module.exports = createFind;


/***/ }),
/* 491 */
/***/ (function(module, exports, __webpack_require__) {

var Set = __webpack_require__(132),
    noop = __webpack_require__(545),
    setToArray = __webpack_require__(60);

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/**
 * Creates a set object of `values`.
 *
 * @private
 * @param {Array} values The values to add to the set.
 * @returns {Object} Returns the new set.
 */
var createSet = !(Set && (1 / setToArray(new Set([,-0]))[1]) == INFINITY) ? noop : function(values) {
  return new Set(values);
};

module.exports = createSet;


/***/ }),
/* 492 */,
/* 493 */,
/* 494 */,
/* 495 */,
/* 496 */,
/* 497 */,
/* 498 */,
/* 499 */,
/* 500 */,
/* 501 */,
/* 502 */,
/* 503 */,
/* 504 */,
/* 505 */,
/* 506 */,
/* 507 */,
/* 508 */,
/* 509 */,
/* 510 */,
/* 511 */,
/* 512 */,
/* 513 */,
/* 514 */,
/* 515 */,
/* 516 */,
/* 517 */,
/* 518 */,
/* 519 */,
/* 520 */,
/* 521 */,
/* 522 */,
/* 523 */,
/* 524 */,
/* 525 */,
/* 526 */,
/* 527 */,
/* 528 */,
/* 529 */,
/* 530 */,
/* 531 */,
/* 532 */,
/* 533 */,
/* 534 */
/***/ (function(module, exports) {

/**
 * A specialized version of `_.indexOf` which performs strict equality
 * comparisons of values, i.e. `===`.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function strictIndexOf(array, value, fromIndex) {
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

module.exports = strictIndexOf;


/***/ }),
/* 535 */,
/* 536 */,
/* 537 */,
/* 538 */
/***/ (function(module, exports, __webpack_require__) {

var arrayFilter = __webpack_require__(136),
    baseFilter = __webpack_require__(443),
    baseIteratee = __webpack_require__(21),
    isArray = __webpack_require__(9);

/**
 * Iterates over elements of `collection`, returning an array of all elements
 * `predicate` returns truthy for. The predicate is invoked with three
 * arguments: (value, index|key, collection).
 *
 * **Note:** Unlike `_.remove`, this method returns a new array.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 * @see _.reject
 * @example
 *
 * var users = [
 *   { 'user': 'barney', 'age': 36, 'active': true },
 *   { 'user': 'fred',   'age': 40, 'active': false }
 * ];
 *
 * _.filter(users, function(o) { return !o.active; });
 * // => objects for ['fred']
 *
 * // The `_.matches` iteratee shorthand.
 * _.filter(users, { 'age': 36, 'active': true });
 * // => objects for ['barney']
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.filter(users, ['active', false]);
 * // => objects for ['fred']
 *
 * // The `_.property` iteratee shorthand.
 * _.filter(users, 'active');
 * // => objects for ['barney']
 */
function filter(collection, predicate) {
  var func = isArray(collection) ? arrayFilter : baseFilter;
  return func(collection, baseIteratee(predicate, 3));
}

module.exports = filter;


/***/ }),
/* 539 */
/***/ (function(module, exports, __webpack_require__) {

var baseFindIndex = __webpack_require__(141),
    baseIteratee = __webpack_require__(21),
    toInteger = __webpack_require__(554);

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * This method is like `_.find` except that it returns the index of the first
 * element `predicate` returns truthy for instead of the element itself.
 *
 * @static
 * @memberOf _
 * @since 1.1.0
 * @category Array
 * @param {Array} array The array to inspect.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @param {number} [fromIndex=0] The index to search from.
 * @returns {number} Returns the index of the found element, else `-1`.
 * @example
 *
 * var users = [
 *   { 'user': 'barney',  'active': false },
 *   { 'user': 'fred',    'active': false },
 *   { 'user': 'pebbles', 'active': true }
 * ];
 *
 * _.findIndex(users, function(o) { return o.user == 'barney'; });
 * // => 0
 *
 * // The `_.matches` iteratee shorthand.
 * _.findIndex(users, { 'user': 'fred', 'active': false });
 * // => 1
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.findIndex(users, ['active', false]);
 * // => 0
 *
 * // The `_.property` iteratee shorthand.
 * _.findIndex(users, 'active');
 * // => 2
 */
function findIndex(array, predicate, fromIndex) {
  var length = array == null ? 0 : array.length;
  if (!length) {
    return -1;
  }
  var index = fromIndex == null ? 0 : toInteger(fromIndex);
  if (index < 0) {
    index = nativeMax(length + index, 0);
  }
  return baseFindIndex(array, baseIteratee(predicate, 3), index);
}

module.exports = findIndex;


/***/ }),
/* 540 */,
/* 541 */
/***/ (function(module, exports, __webpack_require__) {

var isArrayLike = __webpack_require__(23),
    isObjectLike = __webpack_require__(24);

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

module.exports = isArrayLikeObject;


/***/ }),
/* 542 */,
/* 543 */,
/* 544 */,
/* 545 */
/***/ (function(module, exports) {

/**
 * This method returns `undefined`.
 *
 * @static
 * @memberOf _
 * @since 2.3.0
 * @category Util
 * @example
 *
 * _.times(2, _.noop);
 * // => [undefined, undefined]
 */
function noop() {
  // No operation performed.
}

module.exports = noop;


/***/ }),
/* 546 */,
/* 547 */,
/* 548 */
/***/ (function(module, exports, __webpack_require__) {

var basePullAll = __webpack_require__(464);

/**
 * This method is like `_.pull` except that it accepts an array of values to remove.
 *
 * **Note:** Unlike `_.difference`, this method mutates `array`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Array
 * @param {Array} array The array to modify.
 * @param {Array} values The values to remove.
 * @returns {Array} Returns `array`.
 * @example
 *
 * var array = ['a', 'b', 'c', 'a', 'b', 'c'];
 *
 * _.pullAll(array, ['a', 'c']);
 * console.log(array);
 * // => ['b', 'b']
 */
function pullAll(array, values) {
  return (array && array.length && values && values.length)
    ? basePullAll(array, values)
    : array;
}

module.exports = pullAll;


/***/ }),
/* 549 */,
/* 550 */
/***/ (function(module, exports, __webpack_require__) {

var baseIteratee = __webpack_require__(21),
    basePullAt = __webpack_require__(465);

/**
 * Removes all elements from `array` that `predicate` returns truthy for
 * and returns an array of the removed elements. The predicate is invoked
 * with three arguments: (value, index, array).
 *
 * **Note:** Unlike `_.filter`, this method mutates `array`. Use `_.pull`
 * to pull elements from an array by value.
 *
 * @static
 * @memberOf _
 * @since 2.0.0
 * @category Array
 * @param {Array} array The array to modify.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @returns {Array} Returns the new array of removed elements.
 * @example
 *
 * var array = [1, 2, 3, 4];
 * var evens = _.remove(array, function(n) {
 *   return n % 2 == 0;
 * });
 *
 * console.log(array);
 * // => [1, 3]
 *
 * console.log(evens);
 * // => [2, 4]
 */
function remove(array, predicate) {
  var result = [];
  if (!(array && array.length)) {
    return result;
  }
  var index = -1,
      indexes = [],
      length = array.length;

  predicate = baseIteratee(predicate, 3);
  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result.push(value);
      indexes.push(index);
    }
  }
  basePullAt(array, indexes);
  return result;
}

module.exports = remove;


/***/ }),
/* 551 */
/***/ (function(module, exports, __webpack_require__) {

var arraySome = __webpack_require__(138),
    baseIteratee = __webpack_require__(21),
    baseSome = __webpack_require__(470),
    isArray = __webpack_require__(9),
    isIterateeCall = __webpack_require__(155);

/**
 * Checks if `predicate` returns truthy for **any** element of `collection`.
 * Iteration is stopped once `predicate` returns truthy. The predicate is
 * invoked with three arguments: (value, index|key, collection).
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Collection
 * @param {Array|Object} collection The collection to iterate over.
 * @param {Function} [predicate=_.identity] The function invoked per iteration.
 * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 * @example
 *
 * _.some([null, 0, 'yes', false], Boolean);
 * // => true
 *
 * var users = [
 *   { 'user': 'barney', 'active': true },
 *   { 'user': 'fred',   'active': false }
 * ];
 *
 * // The `_.matches` iteratee shorthand.
 * _.some(users, { 'user': 'barney', 'active': false });
 * // => false
 *
 * // The `_.matchesProperty` iteratee shorthand.
 * _.some(users, ['active', false]);
 * // => true
 *
 * // The `_.property` iteratee shorthand.
 * _.some(users, 'active');
 * // => true
 */
function some(collection, predicate, guard) {
  var func = isArray(collection) ? arraySome : baseSome;
  if (guard && isIterateeCall(collection, predicate, guard)) {
    predicate = undefined;
  }
  return func(collection, baseIteratee(predicate, 3));
}

module.exports = some;


/***/ }),
/* 552 */,
/* 553 */
/***/ (function(module, exports, __webpack_require__) {

var toNumber = __webpack_require__(555);

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0,
    MAX_INTEGER = 1.7976931348623157e+308;

/**
 * Converts `value` to a finite number.
 *
 * @static
 * @memberOf _
 * @since 4.12.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted number.
 * @example
 *
 * _.toFinite(3.2);
 * // => 3.2
 *
 * _.toFinite(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toFinite(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toFinite('3.2');
 * // => 3.2
 */
function toFinite(value) {
  if (!value) {
    return value === 0 ? value : 0;
  }
  value = toNumber(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = (value < 0 ? -1 : 1);
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}

module.exports = toFinite;


/***/ }),
/* 554 */
/***/ (function(module, exports, __webpack_require__) {

var toFinite = __webpack_require__(553);

/**
 * Converts `value` to an integer.
 *
 * **Note:** This method is loosely based on
 * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {number} Returns the converted integer.
 * @example
 *
 * _.toInteger(3.2);
 * // => 3
 *
 * _.toInteger(Number.MIN_VALUE);
 * // => 0
 *
 * _.toInteger(Infinity);
 * // => 1.7976931348623157e+308
 *
 * _.toInteger('3.2');
 * // => 3
 */
function toInteger(value) {
  var result = toFinite(value),
      remainder = result % 1;

  return result === result ? (remainder ? result - remainder : result) : 0;
}

module.exports = toInteger;


/***/ }),
/* 555 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(15),
    isSymbol = __webpack_require__(41);

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = toNumber;


/***/ }),
/* 556 */
/***/ (function(module, exports, __webpack_require__) {

var baseFlatten = __webpack_require__(94),
    baseRest = __webpack_require__(96),
    baseUniq = __webpack_require__(474),
    isArrayLikeObject = __webpack_require__(541),
    last = __webpack_require__(167);

/**
 * This method is like `_.union` except that it accepts `comparator` which
 * is invoked to compare elements of `arrays`. Result values are chosen from
 * the first array in which the value occurs. The comparator is invoked
 * with two arguments: (arrVal, othVal).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Array
 * @param {...Array} [arrays] The arrays to inspect.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns the new array of combined values.
 * @example
 *
 * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }];
 * var others = [{ 'x': 1, 'y': 1 }, { 'x': 1, 'y': 2 }];
 *
 * _.unionWith(objects, others, _.isEqual);
 * // => [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }, { 'x': 1, 'y': 1 }]
 */
var unionWith = baseRest(function(arrays) {
  var comparator = last(arrays);
  comparator = typeof comparator == 'function' ? comparator : undefined;
  return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), undefined, comparator);
});

module.exports = unionWith;


/***/ }),
/* 557 */,
/* 558 */,
/* 559 */,
/* 560 */,
/* 561 */,
/* 562 */,
/* 563 */,
/* 564 */,
/* 565 */,
/* 566 */,
/* 567 */,
/* 568 */,
/* 569 */,
/* 570 */,
/* 571 */,
/* 572 */,
/* 573 */,
/* 574 */,
/* 575 */,
/* 576 */,
/* 577 */,
/* 578 */,
/* 579 */,
/* 580 */,
/* 581 */,
/* 582 */,
/* 583 */,
/* 584 */,
/* 585 */,
/* 586 */,
/* 587 */,
/* 588 */,
/* 589 */,
/* 590 */,
/* 591 */,
/* 592 */,
/* 593 */,
/* 594 */,
/* 595 */,
/* 596 */,
/* 597 */,
/* 598 */,
/* 599 */,
/* 600 */,
/* 601 */,
/* 602 */,
/* 603 */,
/* 604 */,
/* 605 */,
/* 606 */,
/* 607 */,
/* 608 */,
/* 609 */,
/* 610 */,
/* 611 */,
/* 612 */,
/* 613 */,
/* 614 */,
/* 615 */,
/* 616 */,
/* 617 */,
/* 618 */,
/* 619 */,
/* 620 */,
/* 621 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(333);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./App.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./App.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 622 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(334);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./AddButton.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./AddButton.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 623 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(335);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Button.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Button.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 624 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(336);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./RemoveButton.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./RemoveButton.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 625 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(337);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./CatalogPreview.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./CatalogPreview.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 626 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(338);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./ObsoleteWarning.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./ObsoleteWarning.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 627 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(339);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Chart.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Chart.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 628 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(340);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../node_modules/css-loader/index.js??ref--2-1!../../../../node_modules/postcss-loader/index.js!./DoughnutChart.css", function() {
			var newContent = require("!!../../../../node_modules/css-loader/index.js??ref--2-1!../../../../node_modules/postcss-loader/index.js!./DoughnutChart.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 629 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(341);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./CircularProgress.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./CircularProgress.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 630 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(342);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Errors.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Errors.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 631 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(343);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./PastEvent.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./PastEvent.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 632 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(344);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Facet.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Facet.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 633 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(345);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./FacetsGroup.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./FacetsGroup.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 634 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(346);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Filter.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Filter.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 635 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(347);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Footer.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Footer.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 636 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(348);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Header.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Header.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 637 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(349);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Home.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Home.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 638 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(350);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./NewsletterForm.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./NewsletterForm.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 639 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(351);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./NotFound.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./NotFound.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 640 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(352);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Pagination.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Pagination.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 641 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(353);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./OtherProducers.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./OtherProducers.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 642 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(354);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./OtherProducersItem.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./OtherProducersItem.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 643 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(355);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Producers.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Producers.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 644 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(356);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./RelatedProducers.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./RelatedProducers.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 645 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(357);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./UnrelatedProducers.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./UnrelatedProducers.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 646 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(358);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./SearchInput.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./SearchInput.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 647 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(359);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Section.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./Section.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 648 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(360);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./SocialLinks.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./SocialLinks.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 649 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(361);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../node_modules/css-loader/index.js??ref--2-1!../../../../node_modules/postcss-loader/index.js!./Counter.css", function() {
			var newContent = require("!!../../../../node_modules/css-loader/index.js??ref--2-1!../../../../node_modules/postcss-loader/index.js!./Counter.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 650 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(362);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./User.css", function() {
			var newContent = require("!!../../../node_modules/css-loader/index.js??ref--2-1!../../../node_modules/postcss-loader/index.js!./User.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 651 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(363);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../node_modules/css-loader/index.js??ref--2-1!../node_modules/postcss-loader/index.js!./leaflet.css", function() {
			var newContent = require("!!../node_modules/css-loader/index.js??ref--2-1!../node_modules/postcss-loader/index.js!./leaflet.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 652 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(364);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./CatalogSection.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./CatalogSection.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 653 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(365);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./HarvestsSection.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./HarvestsSection.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 654 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(366);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./HarvestsTable.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./HarvestsTable.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 655 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(367);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OrganizationsSection.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OrganizationsSection.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 656 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(368);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./StatisticsSection.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./StatisticsSection.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 657 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(369);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./CatalogDetail.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./CatalogDetail.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 658 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(370);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Catalogs.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Catalogs.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 659 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(371);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./HarvestDetail.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./HarvestDetail.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 660 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(372);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Check.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Check.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 661 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(373);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Contact.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Contact.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 662 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(374);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Contacts.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Contacts.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 663 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(375);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetChecklist.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetChecklist.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 664 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(376);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetDescription.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetDescription.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 665 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(377);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetPreview.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetPreview.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 666 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(378);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetSection.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetSection.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 667 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(379);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetTable.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetTable.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 668 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(380);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Datasets.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Datasets.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 669 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(381);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetsResults.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetsResults.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 670 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(382);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Discussion.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Discussion.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 671 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(383);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Discussions.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Discussions.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 672 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(384);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Message.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Message.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 673 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(385);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Download.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Download.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 674 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(386);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DownloadDatasets.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DownloadDatasets.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 675 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(387);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OtherDownload.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OtherDownload.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 676 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(388);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./FiltersSection.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./FiltersSection.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 677 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(389);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./LinksSection.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./LinksSection.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 678 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(390);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./MarkdownViewer.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./MarkdownViewer.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 679 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(391);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./PreviewMap.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./PreviewMap.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 680 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(392);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Producer.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Producer.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 681 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(393);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./SpatialExtentMap.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./SpatialExtentMap.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 682 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(394);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./TechnicalInformations.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./TechnicalInformations.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 683 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(395);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Thumbnails.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Thumbnails.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 684 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(396);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Viewer.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Viewer.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 685 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(398);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Events.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Events.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 686 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(399);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./ActivateOrganization.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./ActivateOrganization.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 687 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(400);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./AddCatalogs.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./AddCatalogs.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 688 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(401);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetToSelect.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetToSelect.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 689 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(402);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetsPublication.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetsPublication.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 690 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(403);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetsToBePublished.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./DatasetsToBePublished.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 691 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(404);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Layout.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Layout.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 692 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(405);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./ManageOrganization.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./ManageOrganization.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 693 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(406);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OrganizationDatasets.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OrganizationDatasets.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 694 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(407);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OrganizationMetrics.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OrganizationMetrics.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 695 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(408);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OrganizationPreview.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OrganizationPreview.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 696 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(409);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OrganizationProducersPreview.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./OrganizationProducersPreview.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 697 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(410);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Organizations.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./Organizations.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 698 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(411);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./PublishedDatasets.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./PublishedDatasets.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 699 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(412);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(2)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./SourceCatalogs.css", function() {
			var newContent = require("!!../../../../../node_modules/css-loader/index.js??ref--2-1!../../../../../node_modules/postcss-loader/index.js!./SourceCatalogs.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 700 */
/***/ (function(module, exports, __webpack_require__) {

var escapeRegExp = __webpack_require__(701);

module.exports = function defaultToWhiteSpace(characters) {
  if (characters == null)
    return '\\s';
  else if (characters.source)
    return characters.source;
  else
    return '[' + escapeRegExp(characters) + ']';
};


/***/ }),
/* 701 */
/***/ (function(module, exports, __webpack_require__) {

var makeString = __webpack_require__(67);

module.exports = function escapeRegExp(str) {
  return makeString(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};


/***/ }),
/* 702 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * _s.prune: a more elegant version of truncate
 * prune extra chars, never leaving a half-chopped word.
 * @author github.com/rwz
 */
var makeString = __webpack_require__(67);
var rtrim = __webpack_require__(703);

module.exports = function prune(str, length, pruneStr) {
  str = makeString(str);
  length = ~~length;
  pruneStr = pruneStr != null ? String(pruneStr) : '...';

  if (str.length <= length) return str;

  var tmpl = function(c) {
      return c.toUpperCase() !== c.toLowerCase() ? 'A' : ' ';
    },
    template = str.slice(0, length + 1).replace(/.(?=\W*\w*$)/g, tmpl); // 'Hello, world' -> 'HellAA AAAAA'

  if (template.slice(template.length - 2).match(/\w\w/))
    template = template.replace(/\s*\S+$/, '');
  else
    template = rtrim(template.slice(0, template.length - 1));

  return (template + pruneStr).length > str.length ? str : str.slice(0, template.length) + pruneStr;
};


/***/ }),
/* 703 */
/***/ (function(module, exports, __webpack_require__) {

var makeString = __webpack_require__(67);
var defaultToWhiteSpace = __webpack_require__(700);
var nativeTrimRight = String.prototype.trimRight;

module.exports = function rtrim(str, characters) {
  str = makeString(str);
  if (!characters && nativeTrimRight) return nativeTrimRight.call(str);
  characters = defaultToWhiteSpace(characters);
  return str.replace(new RegExp(characters + '+$'), '');
};


/***/ }),
/* 704 */
/***/ (function(module, exports, __webpack_require__) {

var makeString = __webpack_require__(67);

module.exports = function strRightBack(str, sep) {
  str = makeString(str);
  sep = makeString(sep);
  var pos = !sep ? -1 : str.lastIndexOf(sep);
  return~ pos ? str.slice(pos + sep.length, str.length) : str;
};


/***/ })
],[232]);
//# sourceMappingURL=app.ef76d0c1.js.map