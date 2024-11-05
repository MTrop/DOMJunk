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

	if (!CTX.Element) {
		console.error("Missing required type: Element.");
		return;
	}
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


	/********************************************************************/
	/** Utilities                                                      **/
	/********************************************************************/

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

	const HTML_REGEX = /<\/?[a-z][\s\S]*>/i;

	const HTML_ESCAPE = (input) => input.replace(HTML_SPECIAL, (m) => ENTITIES[m]);

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
		else if (isArray(list)) {
			for (let i = 0; i < list.length; i++) {
				if (func(list[i], i, list.length))
					break;
			}
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
	
	const isHTML = function(obj) {
		return HTML_REGEX.test(obj);
	}

	const createHTML = function(html) {
		const outElement = document.createElement('template');
		outElement.innerHTML = html;
		return outElement.content.childNodes;
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

	const createText = function(data) {
		return document.createTextNode(data);
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
		return new SelectionGroup(document.getElementById(id));
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

	class SelectionGroup extends Array {
		constructor(elements, forceOne) {
			super();
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
	/** Commands                                                       **/
	/********************************************************************/

	/**
	 * Calls a function on each element in the SelectionGroup.
	 * Each element is passed to the function as "this" and the first 
	 * parameter (for fat-arrow lambdas that preserve "this").
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
	const $search = function(query, one) {
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
		return new SelectionGroup(this.children[index]);
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
		return new SelectionGroup(this.parentElement);
	};

	/**
	 * Gets the parents of the first DOM element in the SelectionGroup.
	 * @returns {SelectionGroup} the new SelectionGroup with the parent elements.
	 */
	const $ancestors = function() {
		let elem = this;
		const out = [];
		while (elem.parentElement !== null) {
			out.push(elem.parentElement);
			elem = elem.parentElement;
		}
		return new SelectionGroup(out);
	};

	/**
	 * Gets all of the children and the children's children of the first DOM element in the SelectionGroup.
	 * @returns {SelectionGroup} the new SelectionGroup with the descending elements.
	 */
	const $descendants = function() {
		const out = [];
		const childQueue = [ ...this.children];
		while (childQueue.length > 0) {
			const child = childQueue.pop();
			out.push(child);
			for (let i = 0; i < child.children.length; i++) {
				childQueue.push(child.children[i]);
			}
		}
		return new SelectionGroup(out);
	};

	/**
	 * Gets all of the siblings of first DOM element in the SelectionGroup (parent's children nminus the source element).
	 * @returns {SelectionGroup} the new SelectionGroup with the sibling elements.
	 */
	const $siblings = function() {
		const out = [];
		const children = [ ...this.parentElement.children];
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (child !== this)
				out.push(child);
		}
		return new SelectionGroup(out);
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
		if (elements instanceof SelectionGroup || isArray(elements)) {
			for (let i = 0; i < elements.length; i++) {
				this.appendChild(elements[i]);
			}
		}
		else if (elements instanceof NodeList) {
			for (let i = 0; i < elements.length; i++) {
				this.appendChild(elements[i]);
			}
		}
		else if (elements instanceof Document || elements instanceof DocumentFragment) {
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
	 * @param {*} elements one or more children to add.
	 */
	const $refill = function(elements) {
		(new SelectionGroup(this)).clear().append(elements);
	};

	/**
	 * Removes all of the children in each DOM element in the SelectionGroup, and
	 * fills them with a new list of children.
	 * Equivalent to: .clear().append(DOMJunk.createTemplateElements(template, model))
	 * @param {Template | SelectionGroup} template the template element to use (can be a SelectionGroup - the first element is used if so).
	 * @param {Object} model the model for the template.
	 */
	const $refillTemplate = function(template, model) {
		if (template instanceof SelectionGroup)
			template = template[0];
		(new SelectionGroup(this)).clear().append(DOMJunk.createTemplateElements(
			template, model
		));
	};

	/**
	 * Removes all of the children in each DOM element in the SelectionGroup, and
	 * then, using the provided array of data, fills them with children generated
	 * from the provided array.
	 * If a non-truthy value is returned for an array element, it is not added.
	 * @param {Array} arr the array of objects. Can be an object - they are both iterated on.
	 * @param {Function} generatorFunc the element generator function. 
	 * 		First parameter is the array element to use, second is the array/map key.
	 */
	const $refillList = function(arr, generatorFunc) {
		const elements = [];
		each(arr, (v, k) => {
			const gen = generatorFunc(v, k);
			if (gen) {
				elements.push(gen);
			}
		});
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
			this.innerHTML = HTML_ESCAPE(text);
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
			return { ...this.style };
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
	 * @param {string} classNames... the vararg list of class names to add to each element.
	 */
	const $classAdd = function(/* classNames... */) {
		const classNames = arguments;
		const classes = this.className.trim().length > 0 ? this.className.split(/\s+/) : [];
		const classSet = fold({}, (obj) => {
			classes.map((c) => {obj[c] = true;});
		});
		for (let i = 0; i < classNames.length; i++) {
			if (!classSet[classNames[i]]) {
				classes.push(classNames[i]);
			}
		}
		this.className = classes.join(" ");
	};

	/**
	 * Removes a set of CSS classes from each element in the SelectionGroup.
	 * @param {string} classNames... the vararg list of class names to remove from each element.
	 */
	const $classRemove = function(/* classNames... */) {
		const classNames = arguments;
		const classes = this.className.trim().length > 0 ? this.className.split(/\s+/) : [];
		const remset = {};
		for (let i = 0; i < classNames.length; i++) {
			remset[classNames[i]] = true;
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
	 * @param {string} classNames... the vararg list of class names to toggle in each element.
	 */
	const $classToggle = function(/* classNames... */) {
		const classNames = arguments;
		const classes = this.className.trim().length > 0 ? this.className.split(/\s+/) : [];
		const classSet = fold({}, (obj) => {
			classes.map((c) => {obj[c] = true;});
		});
		const argSet = fold({}, (obj) => {
			each(classNames, (c) => {
				obj[c] = true;
			});
		});
		
		const out = [];

		for (let i = 0; i < classes.length; i++) {
			const name = classes[i];
			if (!argSet[name]) {
				out.push(name);
			}
		}
		for (let i = 0; i < classNames.length; i++) {
			const name = classNames[i];
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
	 * @returns an object of the name/value pairings of the form fields, or the pass-through selection group if a callback was provided.
	 */
	const $form = function(callback) {
		
		if (!isUndefined(callback) && !isFunction(callback)) {
			throw new Error("Callback function for formData must be a function!");
		}
		
		const formData = {};

		const GATHERFUNC = function() {
			const memberName = this.getAttribute('name');
			if (!!memberName) {
				if (!this.disabled) {
					const t = this.getAttribute('type');
					const v = (t === 'checkbox' || t === 'radio') 
						? this.checked && this.value
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

		(new SelectionGroup(this)).search('input, textarea, select').each(GATHERFUNC);

		if (callback) {
			callback(formData);
			return this;
		}
		else {
			return formData;
		}
	};

	/********************************************************************/

	/**
	 * Attaches a function to a DOM element event handler.
	 * The function should take a single parameter: the event that triggered this.
	 * @param {string} eventName the event name (for example, "mouseenter", "click", etc.).
	 * @param {Function} func the function to attach.
	 */
	const $attach = function(eventName, func) {
		this.addEventListener(eventName, func);
	};

	/**
	 * Detaches a function from a DOM element event handler (the "on" members).
	 * @param {string} eventName the event name (for example, "mouseenter", "click", etc.).
	 * @param {Function} func the function to detach.
	 */
	const $detach = function(eventName, func) {
		this.removeEventListener(eventName, func);
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
	 * Takes a single object where the keys are selector queries to run via .search() and
	 * corresponding values are functions to call on the selection results via .each().
	 * @param {Object} selectorMap the mapping of selector strings to functions.
	 */
	const $apply = function(selectorMap) {
		each(selectorMap, (v, k) => {
			this.search(k).each(v);
		});
	};

	/********************************************************************/

	/**
	 * Unwraps a query, returning every element in the query as-is.
	 * @returns {Array} the array of elements. 
	 */
	const $elements = function() {
		return [ ...this];
	};


	/********************************************************************/
	/** Exported                                                       **/
	/********************************************************************/

	/**
	 * Performs a document query, returning the list of matches as a SelectionGroup.
	 * If the first argument is undefined or null, an empty SelectionGroup is returned.
	 * If the first argument is a SelectionGroup (created from this function), a copy of the SelectionGroup is returned.
	 * If the first argument is a string: 
	 * 		if the string contains HTML, it will generate HTML elements and wrap them in a SelectionGroup.
	 * 		else, it is treated as a CSS selector, and the elements that match are in the SelectionGroup. 
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
			else if (query instanceof SelectionGroup || isArray(query)) {
				return new SelectionGroup([ ...query])
			}
			else if (isString(query)) {
				if (isHTML(query)) {
					return new SelectionGroup(createHTML(query));
				} 
				else {
					return !!one 
						? new SelectionGroup(document.querySelector(query))
						: new SelectionGroup(document.querySelectorAll(query))
					;
				}
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
		if (SelectionGroup.prototype[name]) {
			console.warn('DOMJunk: Overriding existing function: ' + name);
		}
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
		if (SelectionGroup.prototype[name]) {
			console.warn('DOMJunk: Overriding existing function: ' + name);
		}
		SelectionGroup.prototype[name] = function() {
			return func.apply(this, arguments);
		};
	};
	
	/**
	 * Auto-selects a series of selection groups using an object that maps
	 * member name to selector query or function that returns a SelectionGroup.
	 * @param {Object} memberSet a map of member name to selector.
	 * 		If the selector is a string, it is used as a selector to build the group.
	 * 		Else if it's a function, it is called to return the member's value.
	 * 		Else, it is the member's value.
	 * @returns {Object} a new object that is a mapping of name to SelectionGroup.
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
	 * Creates one or more elements from a template element, applying a model to
	 * it, and returning a generated element. The template content is assumed to have
	 * "handlebar" tokens in them ("{{tokenName}}") that contain the name of the member to resolve
	 * in the model.
	 * @param {Element} templateElement the template element or a query containing
	 * 		a template element to use as the template.
	 * @param {Object | Array} model a model to use for filling the template.
	 * 		If model is an Array, multiple templates are made and returned.
	 * @returns {Array} an array of generated elements.
	 */
	DOMJunk.createTemplateElements = function(templateElement, model) {
		const templateData = document.importNode(templateElement, true);
		const templateContent = templateData.innerHTML.trim();

		const _GENERATEELEMENT = (modelObject) => {
			const matches = templateContent.match(/{{.+?}}/g);
			let lastSearchIndex = 0;
			let outHTML = '';
			if (matches) {
				for (let i = 0; i < matches.length; i++) {
					const token = matches[i]; // has handlebars
					let matchIndex = templateContent.indexOf(token, lastSearchIndex);
					if (matchIndex >= 0) {
						outHTML += templateContent.substring(lastSearchIndex, matchIndex);
						const expression = token.substring(2, token.length - 2);
						const expressionChain = expression.split(".");
						let result = modelObject;
						for (let j = 0; j < expressionChain.length; j++) {
							result = result[expressionChain[j]];
						}
						if (!isUndefined(result)) {
							outHTML += isNull(result) ? '' : HTML_ESCAPE(result.toString());
						}
						lastSearchIndex = matchIndex + token.length;
					}
				}
				outHTML += templateContent.substring(lastSearchIndex);
			}

			return createHTML(outHTML);
		};

		const generated = [];
		if (isArray(model)) {
			each(model, (m) => {
				each (_GENERATEELEMENT(m), (e) => {
					generated.push(e);
				})
			});
			return generated;
		}
		else {
			each (_GENERATEELEMENT(model), (e) => {
				generated.push(e);
			})
			return generated;
		}
	};

	/********************************************************************/

	let PERFCOUNTER = 0;

	/**
	 * Performance-tests a function for a set of iterations.
	 * @param {Number} iterations the number of iterations to call.
	 * @param {Function} funcTest the function to test.
	 */
	DOMJunk.perfTest = function(iterations, funcTest) {
		const counter = PERFCOUNTER++;
		console.time('perfcount' + counter);
		for (let i = 0; i < iterations; i++) {
			funcTest();
		}
		console.timeEnd('perfcount' + counter);
		funcDone();
	};
	
	/**
	 * Performs an time-based iteration test for a function.
	 * @param {Number} time the time to take for the test (resolution based on performance.now()).
	 * @param {Function} funcCall the function to call repeatedly.
	 * @returns {Number} the amount of iterations taken wwithin the desired time.
	 */
	DOMJunk.iterationTest = function(time, funcCall) {
		let iterations = 0;
		const start = performance.now();
		while(performance.now() - start < time) {
			funcCall();
			iterations++;
		}
		return iterations;
	};

	/********************************************************************/

	DOMJunk.extend('each', $each);
	DOMJunk.extend('search', $search);
	DOMJunk.extend('child', $child);
	DOMJunk.extend('children', $children);
	DOMJunk.extend('parent', $parent);
	DOMJunk.extend('ancestors', $ancestors);
	DOMJunk.extend('descendants', $descendants);
	DOMJunk.extend('siblings', $siblings);

	DOMJunk.extend('clear', $clear);
	DOMJunk.extend('append', $append);
	DOMJunk.extend('refill', $refill);
	DOMJunk.extend('refillTemplate', $refillTemplate);
	DOMJunk.extend('refillList', $refillList);
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
	DOMJunk.extendSelection('elements', $elements);

	const wrapAttach = function(attachName) {
		return function(func) { 
			this.attach(attachName, func); 
		};
	}

	DOMJunk.extendSelection('load',       wrapAttach('load'));
	DOMJunk.extendSelection('unload',     wrapAttach('unload'));
	DOMJunk.extendSelection('click',      wrapAttach('click'));
	DOMJunk.extendSelection('dblclick',   wrapAttach('dblclick'));
	DOMJunk.extendSelection('mouseenter', wrapAttach('mouseenter'));
	DOMJunk.extendSelection('mouseleave', wrapAttach('mouseleave'));
	DOMJunk.extendSelection('keydown',    wrapAttach('keydown'));
	DOMJunk.extendSelection('keyup',      wrapAttach('keyup'));
	DOMJunk.extendSelection('focus',      wrapAttach('focus'));
	DOMJunk.extendSelection('blur',       wrapAttach('blur'));
	DOMJunk.extendSelection('change',     wrapAttach('change'));

	DOMJunk.id =    $getById;
	DOMJunk.class = $getByClassName;
	DOMJunk.tag =   $getByTagName;

	DOMJunk.each = each;
	DOMJunk.fold = fold;
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
	DOMJunk.isHTML = isHTML;

	DOMJunk.h = createHTML;
	DOMJunk.e = createElement;
	DOMJunk.t = createText;

	/********************************************************************/

	let old$DJAssignment     = CTX.$DJ;
	let old$DJMainAssignment = CTX.$DJMain;

	/**
	 * Restores the previous assigment of '$DJ' and '$DJMain' at load.
	 */
	DOMJunk.noConflict = function() {
		CTX.$DJ     = old$DJAssignment;
		CTX.$DJMain = old$DJMainAssignment;
	};
	
	const MAINFUNCS = [];

	CTX.DOMJunk = DOMJunk;
	CTX.$DJ     = DOMJunk;
	CTX.$DJMain = function(func) { 
		MAINFUNCS.push(func);
	};

	/********************************************************************/

	document.addEventListener("DOMContentLoaded", function(){
		for (let i = 0; i < MAINFUNCS.length; i++)
			MAINFUNCS[i]();
	});

	/**
	 TODO: Add stuff, maybe.
		FormValidate
		FormFill
	*/

})(this);
