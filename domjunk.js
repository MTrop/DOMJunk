/****************************************************************************
 * DOMJunk by Matt Tropiano (C) 2021
 * Requires ECMAScript 6
 * Licensed for use under the MIT License
 * @license
 ****************************************************************************/
(function(CTX){
	
		/********************************************************************/
		/** Test Browser Capabilities                                      **/
		/********************************************************************/
	
		if (!CTX.document.querySelectorAll) {
			console.error("Missing required function: document.querySelectorAll.");
			return;
		}
		if (!CTX.document.querySelector) {
			console.error("Missing required function: document.querySelector.");
			return;
		}
		if (!CTX.document.createElement) {
			console.error("Missing required function: document.createElement.");
			return;
		}
		if (!CTX.document.createTextNode) {
			console.error("Missing required function: document.createTextNode.");
			return;
		}
		if (!CTX.Element.prototype.querySelectorAll) {
			console.error("Missing required function: Element.querySelectorAll.");
			return;
		}
		if (!CTX.Element.prototype.querySelector) {
			console.error("Missing required function: Element.querySelector.");
			return;
		}
		if (!CTX.DOMParser) {
			console.error("Missing required object: DOMParser.");
			return;
		}
	
		/********************************************************************/
		/** Utilities                                                      **/
		/********************************************************************/

		const isType = function(obj, type) {
			return Object.prototype.toString.call(obj) === '[object '+type+']';
		};

		const isUndefined = function(obj) {
			return (typeof obj) === 'undefined';
		};

		const isNull = function(obj) {
			return obj === null;
		};

		const isBoolean = function(obj) {
			return isType(obj, 'Boolean');
		};

		const isNumber = function(obj) {
			return isType(obj, 'Number');
		};

		const isString = function(obj) {
			return isType(obj, 'String');
		};

		const isArray = function(obj) {
			return isType(obj, 'Array');
		};

		const isFunction = function(obj) {
			return isType(obj, 'Function');
		};

		const isObject = function(obj) {
			return isType(obj, 'Object');
		};

		const isBlank = function(obj) {
			return (
				   isUndefined(obj)
				|| isNull(obj) 
				|| (isArray(obj) && obj.length === 0) 
				|| (isNumber(obj) && isNaN(obj)) 
				|| (isString(obj) && obj.trim().length === 0)
				|| obj === 0 
			);
		};
		
		const each = function(list, func) {
			if (isUndefined(list) || isNull(list)) {
				return;
			}
			else if (isBoolean(list) || isNumber(list) || isString(list)) {
				func(list, null, 1);
			}
			else {
				for (let x in list) if (list.hasOwnProperty(x)) {
					if (func(list[x], x, list.length))
						break;
				}
			}
		};

		const fold = function(obj, func) {
			func(obj);
			return obj;
		};

		const merge = function() {
			let out = {};
			each(arguments, (a) => {
				out = {...out, ...a};
			});
			return out;
		};

		const queryString = function(map) {
			let accum = [];
			each(map, (value, key) => {
				if (isArray(value)) {
					for (let i = 0; i < value.length; i++) {
						accum.push(
							encodeURIComponent(key) + '=' + encodeURIComponent(value[i])
						);
					}
				}
				else if (!isUndefined(value) && !isNull(value)) {
					accum.push(
						encodeURIComponent(key) + '=' + encodeURIComponent(value)
					);
				}
			});
			return accum.join('&');
		};
		
		const createElement = function(name, attribs, children) {
			const out = document.createElement(name);
			if (attribs) each(attribs, (v, k) => {
				const attrObj = document.createAttribute(k);
				attrObj.value = v;
				out.setAttributeNode(attrObj);
			});

			if (children) {
				if (isArray(children)) {
					for (let i = 0; i < children.length; i++) {
						out.appendChild(children[i]);
					}
				}
				else {
					out.appendChild(children);
				}
			}
			return out;
		};

		// Matches() polyfill.
		const elemMatches = (
			Element.prototype.matches ||
			Element.prototype.matchesSelector || 
			Element.prototype.msMatchesSelector
		);
		
		const matches = function(elem, selector){
			return elemMatches.call(elem, selector);
		};

		const createText = function(data) {
			return document.createTextNode(data);
		};

		const ENTITIES = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
			'/': '&#x2F;',
			'`': '&#x60;',
			'=': '&#x3D;'
		};
		
		const HTML_SPECIAL = /&|\<|\>|\"|\'|\/|`|=/g;

		const AJAX_OPTIONS_DEFAULTS = {
			"data": null,
			"dataType": 'form',
			"responseType": null,
			"headers": {},
			"responseIsSuccess": false,
			"async": true,
			"user": null,
			"password": null
		};

		/********************************************************************/
		/** Other Getters                                                  **/
		/********************************************************************/

		/**
		 * Fetches an element by its id attribute and wraps it in a SelectionGroup.
		 * In most cases, this is more performant than a CSS query.
		 * @param {string} id the id.
		 * @returns {SelectionGroup} the corresponding element in a SelectionGroup, or empty group if no element.
		 */
		const $getById = function(id) {
			return new SelectionGroup(document.getElementById(id), true);
		};

		/**
		 * Fetches a group of elements by an associated class name.
		 * In most cases, this is more performant than a CSS query.
		 * @param {string} classname the class name.
		 * @returns {SelectionGroup} the corresponding elements in a SelectionGroup, or empty group if no elements.
		 */
		const $getByClassName = function(classname) {
			return new SelectionGroup(document.getElementsByClassName(classname));
		};

		/**
		 * Fetches a group of elements by an associated tag name (and optional namespace).
		 * In most cases, this is more performant than a CSS query.
		 * @param {string} tagname the tag name.
		 * @param {string} namespace (optional) the tag namespace.
		 * @returns {SelectionGroup} the corresponding elements in a SelectionGroup, or empty group if no elements.
		 */
		const $getByTagName = function(tagname, namespace) {
			return isUndefined(namespace) 
				? new SelectionGroup(document.getElementsByTagName(tagname)) 
				: new SelectionGroup(document.getElementsByTagNameNS(namespace, tagname))
			;
		};

		/********************************************************************/
		/** Classes                                                        **/
		/********************************************************************/

		class SelectionGroup {
			constructor(elements, forceOne) {
				// Make empty if no elements.
				if (isUndefined(elements) || isNull(elements)) {
					this.length = 0;
				}
				// Wrap in one thing if not an array or list.
				else if (!!forceOne || isUndefined(elements.length)) {
					this[0] = elements;
					this.length = 1;
				}
				// Else, turn into selection.
				else {
					for (let i = 0; i < elements.length; i++) {
						this[i] = elements[i];
					}
					this.length = elements.length;
				}
			}
		}

		/********************************************************************/

		class AJAXCall {

			constructor(url, opt, body) {
				// callbacks
				this.beforeSendFunc = null;
				
				this.uploadStartFunc = null;
				this.uploadProgressFunc = null;
				this.uploadSuccessFunc = null;
				this.uploadEndFunc = null;

				this.startFunc = null;
				this.progressFunc = null;
				this.successFunc = null;
				this.failureFunc = null;
				this.alwaysFunc = null;
				this.abortFunc = null;
				this.timeoutFunc = null;

				const FAILFUNC = (event) => {
					this.failureFunc && this.failureFunc(xhr.status, xhr.statusText, xhr, event);
				};
				const ABORTFUNC = (event) => {
					this.abortFunc && this.abortFunc(xhr, event);
				};
				const TIMEOUTFUNC = (event) => {
					this.timeoutFunc && this.timeoutFunc(xhr, event);
				};

				const xhr = new XMLHttpRequest();
				// open connection.
				xhr.open(opt.method, url, opt.async, opt.user, opt.password);
				if (opt.headers) each(opt.headers, (value, key) => {
					xhr.setRequestHeader(key, value);
				});

				// ==== Upload ====
				xhr.upload.onloadstart = (event) => {
					this.uploadStartFunc && this.uploadStartFunc(xhr, event);
				};
				xhr.upload.onprogress = (event) => {
					this.uploadProgressFunc && this.uploadProgressFunc((event.lengthComputable ? event.loaded / event.total : 0), event.loaded, event.total, xhr, event);
				};
				xhr.upload.onload = (event) => {
					this.uploadSuccessFunc && this.uploadSuccessFunc(xhr, event);
				};
				xhr.upload.onloadend = (event) => {
					this.uploadEndFunc && this.uploadEndFunc(xhr, event);
				};
				xhr.upload.onerror = FAILFUNC;
				xhr.upload.onabort = ABORTFUNC;
				xhr.upload.ontimeout = TIMEOUTFUNC;

				// ==== Download ====
				xhr.onloadstart = (event) => {
					this.startFunc && this.startFunc(xhr, event);
				};
				xhr.onprogress = (event) => {
					this.progressFunc && this.progressFunc((event.lengthComputable ? event.loaded / event.total : 0), event.loaded, event.total, xhr, event);
				};
				xhr.onerror = FAILFUNC;
				xhr.onabort = ABORTFUNC;
				xhr.ontimeout = TIMEOUTFUNC;

				xhr.onload = (event) => {
					
					let c = parseInt(xhr.status / 100, 10);
		
					// Bad Response
					if ((c === 4 || c === 5) && !opt.responseIsSuccess) {
						this.failureFunc && this.failureFunc(xhr.status, xhr.statusText, xhr, event);
						return;
					}
					
					if (this.successFunc) {
						try {
							const CHARSET = 'charset=';
							const responseContentType = xhr.getResponseHeader('Content-Type');
		
							const idx = responseContentType.indexOf(';');
							const mimeType = idx >= 0 ? responseContentType.substring(0, idx) : responseContentType;
		
							const charsetIdx = responseContentType.indexOf(CHARSET);
							const charsetType = charsetIdx >= 0 ? responseContentType.substring(charsetIdx + CHARSET.length, responseContentType.length).trim() : null;
		
							const typeName = opt.responseType || mimeType;
		
							const res = responseTypeHandlers[typeName] 
								? responseTypeHandlers[typeName](xhr.response, xhr.responseType, mimeType, charsetType, responseContentType)
								: xhr.response;
							
							this.successFunc(res, xhr.status, xhr.statusText, xhr, event);
						} catch (err) {
							this.failureFunc && this.failureFunc(null, null, xhr, event, err);
							this.alwaysFunc && this.alwaysFunc(event, xhr);
						}
					}
				};
				xhr.onloadend = (event) => {
					this.alwaysFunc && this.alwaysFunc(xhr, event);
				};

				// Delay send - user may be setting fields on this object, await event yield.
				setTimeout(() => {
					try {
						this.beforeSendFunc && this.beforeSendFunc(xhr);
						xhr.send(body);
					} catch (err) {
						this.failureFunc && this.failureFunc(null, null, xhr, null, err);
						this.alwaysFunc && this.alwaysFunc(null, xhr);
					}
				}, 0);
			}

			/**
			 * Sets the function to invoke right before the request is sent.
			 * @param {Function} func a function that takes:
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			beforeSend(func) {
				this.beforeSendFunc = func;
				return this;
			};

			/**
			 * Sets the function to invoke right before loading starts.
			 * @param {Function} func a function that takes:
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			start(func) {
				this.startFunc = func;
				return this;
			};

			/**
			 * Sets the function to invoke on progress updates (if supported).
			 * @param {Function} func a function that takes:
			 *		percent (Number): percent progress.
			 *		loaded (Number): loaded amount progress (if length is computable - may be undefined if not).
			 *		total (Number): total amount progress (if length is computable - may be undefined if not).
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			progress(func) {
				this.progressFunc = func;
				return this;
			};

			/**
			 * Sets the function to invoke on successful finish.
			 * @param {Function} func a function that takes:
			 *		data (Varies): the returned data, altered by expected type.
			 *		status (Number): the status code.
			 *		statusText (string): the status text.
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			success(func) {
				this.successFunc = func;
				return this;
			};

			/**
			 * Sets the function to invoke right before uploading starts.
			 * @param {Function} func a function that takes:
			 *		xhr (XMLHttpResponse) the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			uploadStart(func) {
				this.uploadStartFunc = func;
				return this;
			};

			/**
			 * Sets the function to invoke on upload progress updates (if supported).
			 * @param {Function} func a function that takes:
			 *		percent (Number): percent progress.
			 *		loaded (Number): loaded amount progress (if length is computable - may be undefined if not).
			 *		total (Number): total amount progress (if length is computable - may be undefined if not).
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			uploadProgress(func) {
				this.uploadProgressFunc = func;
				return this;
			};

			/**
			 * Sets the function to invoke on successful upload completion.
			 * @param {Function} func a function that takes:
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			uploadSuccess(func) {
				this.uploadSuccessFunc = func;
				return this;
			};

			/**
			 * Sets the function to invoke on upload end.
			 * @param {Function} func a function that takes:
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			uploadFinished(func) {
				this.uploadEndFunc = func;
				return this;
			};

			/**
			 * Sets the function to invoke on failure (and upload failure).
			 * @param {Function} func a function that takes:
			 *		status (Number): the status code (can be null if thrown error).
			 *		statusText (string): the status text (can be null if thrown error).
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 *		err (Error): JS error object if error.
			 * @returns {AJAXCall} itself for chaining.
			 */
			failure(func) {
				this.failureFunc = func;
				return this;
			};

			/**
			 * Sets the function to always invoke, be it success, failure, or aborted call.
			 * @param {Function} func a function that takes:
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			always(func) {
				this.alwaysFunc = func;
				return this;
			};

			/**
			 * Sets the function to invoke on abort (and upload abort).
			 * @param {Function} func a function that takes:
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			abort(func) {
				this.abortFunc = func;
				return this;
			};

			/**
			 * Sets the function to invoke on timeout (and upload timeout).
			 * @param {Function} func a function that takes:
			 *		xhr (XMLHttpResponse): the actual XMLHttpResponse object.
			 *		event (ProgressEvent): the actual Event object.
			 * @returns {AJAXCall} itself for chaining.
			 */
			timeout(func) {
				this.timeoutFunc = func;
				return this;
			};

		}

		AJAXCall.prototype.responseTypeHandlers = {};

		/********************************************************************/

		class AppState {
			constructor(stateApplierFunctionMap) {
				if (!isObject(stateApplierFunctionMap)) {
					throw new Error("Expected object for state applier.");
				}

				this.stateApplierFunctionMap = stateApplierFunctionMap;

				// Component state.
				this.state = {};
				this.nextStateChanges = {};
				this.applierTimeout = null;
			}

			/**
			 * Sets one or more fields on the state, but doesn't attempt to apply
			 * to the state functions.
			 * This will merge the incoming object with the current state.
			 * @param {Object} nextState the new state changes.
			 * @returns {AppState} this AppState object.
			 */
		 	setState(nextState) {
				if (!isObject(nextState)) {
					return;
				}
				each(nextState, (value, key) => {
					this.state[key] = value;
				});
				return this;
			}

			/**
			 * Applies a state object to this state manager.
			 * This will merge the incoming object with the current state, and
			 * send the changed contents to the state applier function map for applying.
			 * This function can be called many times in one event - all accumulated changes
			 * get applied once this event yields.
			 * @param {Object} nextState the new state changes.
			 * @returns {AppState} this AppState object.
			 */
			applyState(nextState) {
				if (!isObject(nextState)) {
					return;
				}
				each(nextState, (value, key) => {
					if (this.state[key] !== value) {
						this.nextStateChanges[key] = value;
					}
				});
				
				// Apply after event yield - many calls may accumulate changes.
				if (this.applierTimeout != null) {
					clearTimeout(this.applierTimeout);
					this.applierTimeout = null;
				}

				this.applierTimeout = setTimeout(() => {
					each(this.nextStateChanges, (value, key) => {
						if (this.stateApplierFunctionMap[key]) {
							this.stateApplierFunctionMap[key](value, this.state[key]);
							this.state[key] = value;
						}
					});
					this.nextStateChanges = {};
				}, 0);

				return this;
			}

			/**
			 * Forces a refresh on a state member as though it changed.
			 * Useful for "deep" changes on state members like objects and arrays that
			 * may not be detected at the member level.
			 * The applier functions are called IMMEDIATELY and within this event.
			 * @param {String...} arguments a series of member names.
			 * @returns {AppState} this AppState object.
			 */
			touchState(/* memberName... */) {
				each(arguments, (memberName) => {
					if (this.stateApplierFunctionMap[memberName]) {
						const value = this.state[key];
						this.stateApplierFunctionMap[key](value, value);
					}
				});
				return this;
			}

			/**
			 * Binds an event handler to a state applier.
			 * This just facilitates some shorthanding.
			 * @param {string} eventName the element event name (e.g. "click", "mouseover", etc.).
			 * @param {*} selector If SelectionGroup object, use that object. If String, use this as a selector for elements. Else, the element to bind to.
			 * @param {Object} nextState if function, the function must return an object to pass to applyState. First parameter is event object, Second is the current state object.
			 * 		If object, it is the object to directly pass to applyState.
			 * @returns {AppState} this AppState object.
			 */
			bindStateEvent(eventName, selector, nextState) {
				const self = this;

				let group = null;
				if (isType("SelectionGroup"))
					group = selector;
				else
					group = DOMJunk(selector);

				group.attach(eventName, function(event) {
					if (isFunction(nextState)) {
						self.applyState(nextState(event, self.state));
					} else {
						self.applyState(nextState);
					}
				});
				return this;
			}

		}

		/********************************************************************/
		/** Commands                                                       **/
		/********************************************************************/

		/**
		 * Calls a function on each element in the SelectionGroup.
		 * Each element is passed to the function as [this] and the first 
		 * parameter (for fat-arrow lambdas that preserve [this]).
		 * @param {function} func the function to call for each element.
		 */
		const $each = function(func) {
			func.apply(this, [this]);
		};

		/**
		 * Performs a document query on the first DOM element in the SelectionGroup, 
		 * and returns a new SelectionGroup of the result.
		 * @param {string} query the CSS/document query.
		 * @param {boolean} one (optional) if true, return the first match.
		 * @returns {SelectionGroup} the new SelectionGroup of matching elements.
		 */
		const $find = function(query, one) {
			return !!one 
				? new SelectionGroup(this.querySelector(query)) 
				: new SelectionGroup(this.querySelectorAll(query))
			;
		};

		/**
		 * Gets a child of the first DOM element in the SelectionGroup.
		 * @param {number} index the index of the child element to fetch.
		 * @returns {SelectionGroup} the new SelectionGroup with the single child.
		 */
		const $child = function(index) {
			return new SelectionGroup(this.children[index], true);
		};

		/**
		 * Gets all immediate children of the first DOM element in the SelectionGroup.
		 * @returns {SelectionGroup} the new SelectionGroup with the children.
		 */
		const $children = function() {
			return new SelectionGroup(this.children);
		};

		/**
		 * Gets the immediate parent of the first DOM element in the SelectionGroup.
		 * @returns {SelectionGroup} the new SelectionGroup with the parent element.
		 */
		const $parent = function() {
			return new SelectionGroup(this.parentElement, true);
		};

		/********************************************************************/

		/**
		 * Removes all of the children in each DOM element in the SelectionGroup.
		 */
		const $clear = function() {
			while (this.firstChild) {
				this.removeChild(this.firstChild);
			}
		};

		/**
		 * Appends one or more child elements to all of the children in each DOM element in the SelectionGroup.
		 * If elements is an array, each child in the array is appended.
		 * If elements is a Document, that Document's children are appended.
		 * Otherwise, elements is considered to be one element, and it is appended.
		 * @param {*} elements one or more children to add.
		 */
		const $append = function(elements) {
			if (isArray(elements)) {
				for (let i = 0; i < elements.length; i++) {
					this.appendChild(elements[i]);
				}
			}
			else if (elements instanceof Document) {
				for (let i = 0; i < elements.children.length; i++) {
					this.appendChild(elements.children[i]);
				}
			}
			else {
				this.appendChild(elements);
			}
		};

		/**
		 * Removes all of the children in each DOM element in the SelectionGroup, and
		 * fills them with a new list of children.
		 * Equivalent to: .clear().append(elements)
		 */
		const $refill = function(elements) {
			(new SelectionGroup(this)).clear().append(elements);
		};

		/**
		 * Gets/Sets the inner HTML.
		 * If HTML is provided, the inner HTML is set.
		 * If it is undefined, this will return the inner HTML of the first DOM element in the SelectionGroup.
		 * @param {string} data HTML data to set.
		 */
		const $html = function(data) {
			if (isUndefined(data)) {
				return this.innerHTML;
			}
			else {
				this.innerHTML = data;
			}
		};

		/**
		 * Gets/Sets the inner text.
		 * If text is provided, the inner HTML is set to the text. Special characters will be converted to entities.
		 * If it is undefined, this will return the inner text of the first DOM element in the SelectionGroup.
		 * @param {string} data HTML data to set.
		 */
		const $text = function(text) {
			if (isUndefined(text)) {
				return this.innerText;
			}
			else {
				this.innerHTML = text.replace(HTML_SPECIAL, (m) => ENTITIES[m]);
			}
		};

		/********************************************************************/

		/**
		 * Sets a member on each element of the SelectionGroup to a value.
		 * @param {string} memberName the member name.
		 * @param {*} value the value.
		 */
		const $set = function(memberName, value) {
			this[memberName] = value;
		};
		
		/**
		 * Merges several members into each object's members in the SelectionGroup.
		 * @param {object} memberMap the mapping of member names to values.
		 */
		const $merge = function(memberMap) {
			each(memberMap, (v, k) => {
				this[k] = v;
			});
		};

		/********************************************************************/

		/**
		 * Merges a set of CSS attributes into each element's local style in the SelectionGroup, or fetches them from the first.
		 * If input is undefined, this will return a copied object of this element's local styles.
		 * If input is an array of CSS attribute names, this will return an object of this element's corresponding local style values.
		 * If input is a CSS attribute name, this will return this element's corresponding local style values.
		 * If input is an object, this sets each element's local style values to the provided CSS attribute names and values.
		 * @param {*} input the input value.
		 */
		const $style = function(input) {
			if (isUndefined(input)) {
				return merge({}, this.style);
			}
			else if (isArray(input)) {
				let out = {};
				each(input, (s) => {
					out[s] = this.style[s];
				});
				return out;
			}
			else if (isObject(input)) {
				each(input, (v, k) => {
					this.style[k] = v;
				});
			}
			else {
				return this.style[input];
			}
		};

		/**
		 * Merges a set of DOM attributes into each element's attributes in the SelectionGroup, or fetches them from the first.
		 * If input is undefined, this will return an object of this element's attribute values.
		 * If input is an array of attribute names, this will return an object of this element's corresponding attribute values.
		 * If input is an attribute name, this will return this element's corresponding attribute value.
		 * If input is an object, this sets each element's attributes to the provided corresponding values.
		 * @param {*} input the input value.
		 */
		const $attr = function(input) {
			if (isUndefined(input)) {
				let out = {};
				const names = this.getAttributeNames();
				for (let i = 0; i < names.length; i++) {
					out[names[i]] = this.getAttribute(names[i]);
				}
				return out;
			}
			else if (isArray(input)) {
				let out = {};
				each(input, (a) => {
					out[a] = this.getAttribute(a);
				});
				return out;
			}
			else if (isObject(input)) {
				each(input, (v, k) => {
					this.setAttribute(k, v);
				});
			}
			else {
				return this.getAttribute(input);
			}
		};

		/**
		 * Adds a set of CSS classes to each element in the SelectionGroup.
		 * @param {string} varargs... the vararg list of class names to add to each element.
		 */
		const $classAdd = function() {
			const classes = this.className.trim().length > 0 ? this.className.split(/\s+/) : [];
			const classSet = fold({}, (obj) => {
				classes.map((c) => {obj[c] = true;});
			});
			for (let i = 0; i < arguments.length; i++) {
				if (!classSet[arguments[i]]) {
					classes.push(arguments[i]);
				}
			}
			this.className = classes.join(" ");
		};

		/**
		 * Removes a set of CSS classes from each element in the SelectionGroup.
		 * @param {string} varargs... the vararg list of class names to remove from each element.
		 */
		const $classRemove = function() {
			const classes = this.className.trim().length > 0 ? this.className.split(/\s+/) : [];
			const remset = {};
			for (let i = 0; i < arguments.length; i++) {
				remset[arguments[i]] = true;
			}
			const out = [];
			each(classes, (c) => {
				if (!remset[c]) {
					out.push(c);
				}
			});
			if (isBlank(out))
				this.removeAttribute('class');
			else
				this.className = out.join(" ");
		};

		/**
		 * Toggles the presence of a set of CSS classes in each element in the SelectionGroup.
		 * If the class exists, it is removed, and if the class does not exist, it is added.
		 * @param {string} varargs... the vararg list of class names to toggle in each element.
		 */
		const $classToggle = function() {
			const classes = this.className.trim().length > 0 ? this.className.split(/\s+/) : [];
			const classSet = fold({}, (obj) => {
				classes.map((c) => {obj[c] = true;});
			});
			const argSet = fold({}, (obj) => {
				each(arguments, (c) => {
					obj[c] = true;
				});
			});
			
			const out = [];

			for (let i = 0; i < classes.length; i++) {
				let name = classes[i];
				if (!argSet[name]) {
					out.push(name);
				}
			}
			for (let i = 0; i < arguments.length; i++) {
				let name = arguments[i];
				if (!classSet[name]) {
					out.push(name);
				}
			}

			if (isBlank(out))
				this.removeAttribute('class');
			else
				this.className = out.join(" ");
		};

		/********************************************************************/

		/**
		 * Scrapes a form element for its values and returns an object of the name-value pairings of the form fields,
		 * or an object mapping (name/id for key).
		 * The 'id' attribute is used if 'name' is not provided. Unnamed, disabled, or unchecked form elements are not scraped.
		 * @param {function} callback (optional) if provided, call this function with one argument: the data returned.
		 * @returns an object of the name/value pairings of the form fields, or the selection group if a callback was provided.
		 */
		const $form = function(callback) {
			
			if (!isUndefined(callback) && !isFunction(callback))
				throw new Error("Callback function for formData must be a function!");
			
			let formData = {};

			const GATHERFUNC = function() {
				let memberName = this.getAttribute('name');
				if (!!memberName) {
					if (!matches(this, ':disabled')) {
						const t = this.getAttribute('type');
						let v = (t === 'checkbox' || t === 'radio') 
							? matches(this, ':checked') && this.value
							: this.value;
						if (v) {
							if (isObject(formData[memberName])) {
								formData[memberName].push(v);
							}
							else if (formData[memberName]) {
								let arr = [formData[memberName], v];
								formData[memberName] = arr;
							}
							else {
								formData[memberName] = v;
							}
						}
					}
				}
			};

			(new SelectionGroup(this)).find('input, textarea, select').each(GATHERFUNC);

			if (callback) {
				callback(formData);
				return this;
			}
			else {
				return formData;
			}
		};

		/********************************************************************/

		const EVENTNAME = (name) => ('on' + name.toLowerCase());

		/**
		 * Attaches a function to a DOM element event handler (the "on" members).
		 * The function attached is wrapped in a different function that
		 * parses out the event target and passes it to the function as [this].
		 * @param {string} eventName the event name (for example, if "mouseover", attaches to "onmouseover").
		 * @param {Function} func the function to wrap (the function's [this] becomes the element, and the function's first arg is the event. Cannot be a lambda closure).
		 */
		const $attach = function(eventName, func) {
			const self = this;
			this[EVENTNAME(eventName)] = func ? function(event) {
				func.apply(self, [event]);
			} : null;
		};

		/**
		 * Detaches a function from a DOM element event handler (the "on" members).
		 * @param {string} eventName the event name (for example, if "mouseover", nullifies "onmouseover").
		 */
		const $detach = function(eventName) {
			this[EVENTNAME(eventName)] = null;
		};

		/********************************************************************/

		/**
		 * Wraps a single element in the SelectionGroup in a new SelectionGroup.
		 * @param {number} index the index of the selected element.
		 * @returns {SelectionGroup} the new SelectionGroup of matching elements.
		 */
		const $get = function(index) {
			return new SelectionGroup(this[index]);
		};

		/**
		 * Wraps the first element in the SelectionGroup in a new SelectionGroup.
		 * @returns {SelectionGroup} the new SelectionGroup.
		 */
		const $first = function() {
			return new SelectionGroup(this[0]);
		};

		/**
		 * Wraps the last element in the SelectionGroup in a new SelectionGroup.
		 * @returns {SelectionGroup} the new SelectionGroup.
		 */
		const $last = function() {
			return new SelectionGroup(this[this.length - 1]);
		};

		/********************************************************************/

		/**
		 * Takes a single object where the keys are selector queries to run via .find() and
		 * corresponding values are functions to call on the selection results via .each().
		 * @param {object} selectorMap the mapping of selector strings to functions.
		 */
		const $apply = function(selectorMap) {
			each(selectorMap, (v, k) => {
				this.find(k).each(v);
			});
		};

		/********************************************************************/

		/**
		 * Start an AJAX call.
		 * @param {*} param 
		 * (string) URL:
		 *		Makes a GET request with the provided URL.
		 *		Default return handling.
		 * (Object) map of options:
		 *		method (string): HTTP method.
		 *		url (string): target URL.
		 *		data (VARIES): content to send:
		 *			(Object) 
		 *				If GET/DELETE, turned into params. 
		 *				If POST/PUT/PATCH, submitted in body and reformatted depending on dataType.
		 *			(string) 
		 *				If GET/DELETE, appended as-is as query. 
		 *				If POST/PUT/PATCH, submitted as text, but dataType is now a MIME.
		 *			(ArrayBuffer) 
		 *				If GET/DELETE, discarded. 
		 *				If POST/PUT/PATCH, submitted as-is, but dataType is now a MIME.
		 *			(ArrayBufferView) 
		 *				If GET/DELETE, discarded. 
		 *				If POST/PUT/PATCH, submitted as-is, but dataType is now a MIME.
		 *			(Blob) 
		 *				If GET/DELETE, discarded. 
		 *				If POST/PUT/PATCH, submitted as-is, but dataType is now a MIME.
		 *			(Document) 
		 *				If GET/DELETE, discarded. 
		 *				If POST/PUT/PATCH, submitted as-is, but dataType is overridden to 'text/html'
		 *			(XMLDocument) 
		 *				If GET/DELETE, discarded. 
		 *				If POST/PUT/PATCH, submitted as-is, but dataType is overridden to 'application/xml'
		 *			(HTMLDocument) 
		 *				If GET/DELETE, discarded. 
		 *				If POST/PUT/PATCH, submitted as-is, but dataType is overridden to 'text/html'
		 *			(FormData) 
		 *				If GET/DELETE, discarded. 
		 *				If POST/PUT/PATCH, submitted as-is, but dataType is overridden to 'multipart/form-data'
		 *		dataType (string): If POST/PUT, the type of data referred to as "data". Usually, this is a MIME type.
		 *			'text': Content-Type is set to 'text/plain'. 
		 *				If data is an Object, JSON-stringify. 
		 *				If text, no conversion.
		 *			'form': Content-Type is set to 'application/x-www-form-urlencoded'. 
		 *				If data is an Object, content is converted to a query string. 
		 *				If text, no conversion.
		 *			'json': Content-Type is set to 'application/json'. 
		 *				If data is an Object, JSON-stringify. 
		 *				If text, no conversion.
		 *			Else, 'application/octet-stream'
		 *		responseType (string): 
		 *			What to expect the data back as (either response handler typename or MIMEtype override).
		 *			Else, default is null, which will attempt to convert based on content MIME. If that fails, return response as-is.
		 *		responseIsSuccess (Boolean): If true, 4XX and 5XX is considered "success.", else 4XX and 5XX is failure.
		 *		headers (Object): Map of HTTP Header name to value.
		 *		async (Boolean): If true, asynchronus. Else, wait until completion.
		 *		user (string): username for authorization.
		 *		password (string): password for authorization.
		 * @returns {AJAXCall} an AJAXCall instance.
		 */
		const $ajax = function(param) {
			let options = null;
			
			if (isString(param)) {
				options = {
					"method": 'GET', 
					"url": param
				};
			}
			else if (isObject(param)) {
				options = param;
			}
			
			if (!options.method) {
				options.method = 'GET';
			}
			else {
				options.method = options.method.toUpperCase();
			}
			
			options.url = options.url || '#';
			
			let opt = merge(AJAX_OPTIONS_DEFAULTS, options);

			let url = opt.url;
			let body = null;
			
			if (!isNull(opt.data) && !isUndefined(opt.data)) {
				if (isObject(opt.data)) {
					if (opt.method === 'GET' || opt.method === 'DELETE') {
						url = url + (url.indexOf('?') >= 0 ? '&' : '?') + queryString(opt.data);
					}
					else {
						if (opt.dataType === 'text') {
							body = queryString(opt.data);
							opt.headers['Content-Type'] = 'text/plain';
						}
						else if (opt.dataType === 'json') {
							body = JSON.stringify(opt.data);
							opt.headers['Content-Type'] = 'application/json';
						}
						else if (opt.dataType === 'form') {
							body = queryString(opt.data);
							opt.headers['Content-Type'] = 'application/x-www-form-urlencoded';
						}
					}
				}
				else if (isString(opt.data) || isType(opt.data, 'DOMString')) {
					if (opt.method === 'GET' || opt.method === 'DELETE') {
						url = url + qs;
					}
					else {
						body = opt.data;
						opt.headers['Content-Type'] = opt.dataType || 'application/octet-stream';
					}
				}
				else if (isType(opt.data, 'ArrayBuffer')) {
					if (!(opt.method === 'GET' || opt.method === 'DELETE')) {
						body = opt.data;
						opt.headers['Content-Type'] = opt.dataType || 'application/octet-stream';
					}
				}
				else if (isType(opt.data, 'ArrayBufferView')) {
					if (!(opt.method === 'GET' || opt.method === 'DELETE')) {
						body = opt.data;
						opt.headers['Content-Type'] = opt.dataType || 'application/octet-stream';
					}
				}
				else if (isType(opt.data, 'Blob')) {
					if (!(opt.method === 'GET' || opt.method === 'DELETE')) {
						body = opt.data;
						opt.headers['Content-Type'] = opt.dataType || 'application/octet-stream';
					}
				}
				else if (isType(opt.data, 'Document') || isType(opt.data, 'HTMLDocument')) {
					if (!(opt.method === 'GET' || opt.method === 'DELETE')) {
						body = opt.data;
						opt.headers['Content-Type'] = 'text/html';
					}
				}
				else if (isType(opt.data, 'XMLDocument')) {
					if (!(opt.method === 'GET' || opt.method === 'DELETE')) {
						body = opt.data;
						opt.headers['Content-Type'] = 'application/xml';
					}
				}
				else if (isType(opt.data, 'FormData')) {
					if (!(opt.method === 'GET' || opt.method === 'DELETE')) {
						body = opt.data;
						opt.headers['Content-Type'] = 'multipart/form-data';
					}
				}
			}
			
			return new AJAXCall(url, opt, body);
		};

		const $jsonAjax = function(method, url, data, headers) {
			return $ajax({
				"method": method, 
				"headers": headers,
				"url": url,
				"data": data,
				"dataType": 'json',
				"responseType": 'json'	
			});
		};

		const $ajaxTextHandler = function (responseContent) {
			if (!Util.isString(responseContent)) {
				return Object.prototype.toString.call(responseContent);
			}
			else {
				return responseContent;
			}
		};

		const $ajaxXMLHandler = function(responseContent, _, mimeType) {
			return (new DOMParser()).parseFromString(responseContent, mimeType);
		};

		const $ajaxJSONHandler = function(responseContent) {
			return JSON.parse(responseContent);
		};

		/********************************************************************/
		/** Exported                                                       **/
		/********************************************************************/

		/**
     	 * Performs a document query, returning the list of matches as a SelectionGroup.
		 * If the first argument is undefined or null, an empty SelectionGroup is returned.
		 * If the first argument is a string, it is treated as a CSS selector, and the elements that match are in the SelectionGroup. 
		 * Anything else, and the SelectionGroup contains that object, or treats it like a group if it is an array.
		 * @param {*} query the CSS/document query.
		 * @param {boolean} one (optional) if true, and CSS selector, return only the first match.
		 * @returns {SelectionGroup} the matching elements, encapsulated.
		 */
		const DOMJunk = new function() {
			return function(query, one) {
				if (isUndefined(query) || isNull(query)) {
					return new SelectionGroup([]);
				}
				else if (isString(query)) {
					return !!one 
						? new SelectionGroup(document.querySelector(query))
						: new SelectionGroup(document.querySelectorAll(query))
					;
				}
				else {
					return new SelectionGroup(query)
				}
			};
		};

		/**
		 * Adds a wrapped function to the SelectionGroup prototype.
		 * The function's [this] keyword becomes each element.
		 * When the function is called, it is called once per element, unless the function returns a value.
		 * If the function returns a value (not undefined), it is returned as the result.
		 * If it never returned a function, the SelectionGroup instance is returned as the result.
		 * @param {string} name the name of the function to add to all query results.
		 * @param {Function} func the function itself (cannot be a lambda closure).
		 */
		DOMJunk.extend = function(name, func) {
			SelectionGroup.prototype[name] = function() {
				let retval;
				for (let i = 0; i < this.length && isUndefined(retval); i++) {
					retval = func.apply(this[i], arguments);
				}
				return isUndefined(retval) ? this : retval;
			};
		};

		/**
		 * Adds a wrapped function to the SelectionGroup prototype.
		 * The function's [this] keyword becomes the SelectionGroup itself.
		 * @param {string} name the name of the function to add.
		 * @param {Function} func the function to add (cannot be a lambda closure).
		 */
		DOMJunk.extendSelection = function(name, func) {
			SelectionGroup.prototype[name] = function() {
				return func.apply(this, arguments);
			};
		};
		
		/**
		 * Adds/sets an AJAX response type handler.
		 * The handled type is either the name of an expected type passed to options,
		 * or the MIME-Type of the response body.
		 * @param {string} handledTypeName the name of type.
		 * @param {Function} func the handler function.
		 */
		DOMJunk.extendAJAX = function(handledTypeName, func) {
			AJAXCall.prototype.responseTypeHandlers[handledTypeName] = func;
		};

		/**
		 * Auto-selects a series of selection groups using an object that maps
		 * member name to selector query or function that returns a SelectionGroup.
		 * @param {Object} memberSet a map of member name to selector.
		 * 		If the selector is a string, it is used as a selector to build the group.
		 * 		Else if it's a function, it is called to return the member's value.
		 * 		Else, it is the member's value.
		 * @returns a new object that is a mapping of name to SelectionGroup.
		 */
		DOMJunk.createGroups = function(memberSet) {
			const out = {};
			each(memberSet, (selector, memberName) => {
				let value = null;
				if (isString(selector)) {
					value = DOMJunk(selector);
				} else if (isFunction(selector)) {
					value = selector();
				} else {
					value = selector;
				}

				out[memberName] = value;
			});
			return out;
		};

		/**
		 * Creates a new application state driver.
		 * @param {Object} stateApplicationFuncMap a map of state member name to Function.
		 * 		The function is called if that state's member changes its value.
		 * 		First function parameter is the new value.
		 * 		Second function parameter is the previous value.
		 * @returns a new AppState object.
		 */
		DOMJunk.createAppState = function(stateApplicationFuncMap) {
			return new AppState(stateApplicationFuncMap);
		};
		
		/********************************************************************/

		DOMJunk.extend('each', $each);
		DOMJunk.extend('find', $find);
		DOMJunk.extend('child', $child);
		DOMJunk.extend('children', $children);
		DOMJunk.extend('parent', $parent);

		DOMJunk.extend('clear', $clear);
		DOMJunk.extend('append', $append);
		DOMJunk.extend('refill', $refill);
		DOMJunk.extend('html', $html);
		DOMJunk.extend('text', $text);

		DOMJunk.extend('set', $set);
		DOMJunk.extend('merge', $merge);

		DOMJunk.extend('style', $style);
		DOMJunk.extend('attr', $attr);
		DOMJunk.extend('classAdd', $classAdd);
		DOMJunk.extend('classRemove', $classRemove);
		DOMJunk.extend('classToggle', $classToggle);

		DOMJunk.extend('attach', $attach);
		DOMJunk.extend('detach', $detach);

		DOMJunk.extendSelection('get', $get);
		DOMJunk.extendSelection('first', $first);
		DOMJunk.extendSelection('last', $last);
		DOMJunk.extendSelection('form', $form);
		DOMJunk.extendSelection('apply', $apply);

		const wrapAttach = function(attachName) {
			return function(func) { this.attach(attachName, func); };
		}

		DOMJunk.extendSelection('load',     wrapAttach('load'));
		DOMJunk.extendSelection('unload',   wrapAttach('unload'));
		DOMJunk.extendSelection('click',    wrapAttach('click'));
		DOMJunk.extendSelection('dblclick', wrapAttach('dblclick'));
		DOMJunk.extendSelection('hover',    wrapAttach('mouseenter'));
		DOMJunk.extendSelection('leave',    wrapAttach('mouseleave'));
		DOMJunk.extendSelection('keydown',  wrapAttach('keydown'));
		DOMJunk.extendSelection('keyup',    wrapAttach('keyup'));
		DOMJunk.extendSelection('focus',    wrapAttach('focus'));
		DOMJunk.extendSelection('blur',     wrapAttach('blur'));
		DOMJunk.extendSelection('change',   wrapAttach('change'));

		DOMJunk.extendAJAX('text', $ajaxTextHandler);
		DOMJunk.extendAJAX('text/plain', $ajaxTextHandler);

		DOMJunk.extendAJAX('json', $ajaxJSONHandler);
		DOMJunk.extendAJAX('application/json', $ajaxJSONHandler);

		DOMJunk.extendAJAX('xml', $ajaxXMLHandler);
		DOMJunk.extendAJAX('text/xml', $ajaxXMLHandler);
		DOMJunk.extendAJAX('application/xml', $ajaxXMLHandler);
		DOMJunk.extendAJAX('html', $ajaxXMLHandler);
		DOMJunk.extendAJAX('text/html', $ajaxXMLHandler);
		DOMJunk.extendAJAX('xhtml', $ajaxXMLHandler);
		DOMJunk.extendAJAX('text/xhtml', $ajaxXMLHandler);
		
		DOMJunk.id =    $getById;
		DOMJunk.class = $getByClassName;
		DOMJunk.tag =   $getByTagName;

		DOMJunk.each = each;
		DOMJunk.fold = fold;
		DOMJunk.merge = merge;
		DOMJunk.queryString = queryString;

		DOMJunk.isType = isType;
		DOMJunk.isUndefined = isUndefined;
		DOMJunk.isNull = isNull;
		DOMJunk.isBoolean = isBoolean;
		DOMJunk.isNumber = isNumber;
		DOMJunk.isString = isString;
		DOMJunk.isArray = isArray;
		DOMJunk.isFunction = isFunction;
		DOMJunk.isObject = isObject;
		DOMJunk.isBlank = isBlank;
		DOMJunk.e = createElement;
		DOMJunk.t = createText;

		DOMJunk.AJAX = $ajax;

		DOMJunk.JSONAJAX =        $jsonAjax;
		DOMJunk.JSONAJAX.get =    function(url, headers)       { return $jsonAjax('get', url, null, headers); };
		DOMJunk.JSONAJAX.delete = function(url, headers)       { return $jsonAjax('delete', url, null, headers); };
		DOMJunk.JSONAJAX.put =    function(url, data, headers) { return $jsonAjax('put', url, data, headers); };
		DOMJunk.JSONAJAX.post =   function(url, data, headers) { return $jsonAjax('post', url, data, headers); };
		DOMJunk.JSONAJAX.patch =  function(url, data, headers) { return $jsonAjax('patch', url, data, headers); };

		/********************************************************************/

		let old$DJAssignment     = CTX.$DJ;
		let old$DJAAssignment    = CTX.$DJA;
		let old$DJJAssignment    = CTX.$DJJ;
		let old$DJMainAssignment = CTX.$DJMain;

		/**
		 * Restores the previous assigment of '$DJ' and '$DJU' and '$DJA' and '$DJJ' at load.
		 */
		DOMJunk.noConflict = function() {
			CTX.$DJ     = old$DJAssignment;
			CTX.$DJA    = old$DJAAssignment;
			CTX.$DJJ    = old$DJJAssignment;
			CTX.$DJMain = old$DJMainAssignment;
		};
		
		CTX.DOMJunk = DOMJunk;
		CTX.$DJ     = DOMJunk;
		CTX.$DJA    = DOMJunk.AJAX;
		CTX.$DJJ    = DOMJunk.JSONAJAX;
		CTX.$DJMain = function(func) { DOMJunk.tag('body').load(func); };

		/**
		 TODO: Add stuff, maybe.
			TemplateCreate
			TemplateSet
			TemplateAppend
			TemplateFill
			FormValidate
			FormFill
			DOMSiblings
			DOMDescendants
			DOMAncestors
		*/

})(this);
