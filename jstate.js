/****************************************************************************
 * JState by Matt Tropiano (C) 2022
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

	// Matches() polyfill.
	const elemMatches = (
		Element.prototype.matches ||
		Element.prototype.matchesSelector || 
		Element.prototype.msMatchesSelector
	);
	
	const matches = function(elem, selector){
		return elemMatches.call(elem, selector);
	};


	/********************************************************************/
	/** Classes                                                        **/
	/********************************************************************/

	// Private state applier timeout setup.
	// Must be apply()'ed to set "this" as the calling AppState object.
	const _STATETIMEOUTAPPLY = function() {
		if (!(this instanceof AppState))
			return;

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
	};

	// Event attacher function.
	const _ATTACH = (eventName, eventfunc) => ((element) => {element.addEventListener(eventName, eventfunc);});

	/********************************************************************/

	/**
	 * AppState class - main driver for state listening.
	 */
	class AppState {

		/**
		 * Creates the app state with a function map.
		 * @param {Object} funcMap the mapping of state member to handler function.
		 * @see addHandler
		 */
		constructor(funcMap) {

			if (!isObject(funcMap)) {
				throw new Error("Expected object for state applier.");
			}

			// Handler functions.
			this.stateApplierFunctionMap = {};
			this.changeVerifierMap = {};

			// State and state processing.
			this.state = {};
			this.nextStateChanges = {};
			this.applierTimeout = null;

			// Main bread and butter.
			each(funcMap, (f, n) => {
				this.addHandler(n, f);
			});
		}

		/**
		 * Adds a state handler to this class.
		 * @param {string} name the state member name to bind to.
		 * @param {Function} func the handler function.
		 * @returns {AppState} this AppState object.
		 */
		addHandler(name, func) {
			if (isFunction(func)) {
				this.stateApplierFunctionMap[name] = func;
			}
			else if (isNull(func) || isUndefined(func)) {
				this.removeHandler(name);
			}
			return this;
		}

		/**
		 * Removes a state handler from this class.
		 * @param {string} name the state member name to bind to.
		 * @returns {AppState} this AppState object.
		 */
		removeHandler(name) {
			delete this.stateApplierFunctionMap[name];
			return this;
		}

		/**
		 * Sets one or more fields on the state, but doesn't attempt to apply
		 * to the state functions.
		 * This will merge the incoming object into the current state.
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
		 * This will merge the incoming object into the current state, and
		 * send the changed contents to the state applier function map for applying.
		 * 
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
			
			// Apply after event yield - many calls during this event may accumulate changes.
			_STATETIMEOUTAPPLY.apply(this);

			return this;
		}

		/**
		 * Forces a refresh on a state member as though it changed.
		 * Useful for "deep" changes on state members like objects and arrays that
		 * may not be detected at the member level or did not qualify via verification.
		 * 
		 * This function can be called many times in one event - all accumulated changes
		 * get applied once this event yields.
		 * @param {String...} arguments a series of member names.
		 * @returns {AppState} this AppState object.
		 */
		touchState(/* memberName... */) {
			each(arguments, (memberName) => {
				if (this.stateApplierFunctionMap[memberName]) {
					this.nextStateChanges[memberName] = this.state[memberName];
				}
			});
			
			// Apply after event yield - many calls during this event may accumulate changes.
			_STATETIMEOUTAPPLY.apply(this);

			return this;
		}

		/**
		 * Binds an event handler to a state applier.
		 * This just facilitates some shorthanding.
		 * @param {string} eventName the element event name (e.g. "click", "mouseenter", etc.).
		 * @param {*} selection If String, use this as a selector for elements. Else if Array of elements, the elements to bind to.
		 * @param {Object} nextState if function, the function must return an object to pass to applyState. First parameter is event object, Second is the current state object.
		 * 		If object, it is the object to directly pass to applyState.
		 * @returns {AppState} this AppState object.
		 */
		bindStateEvent(eventName, selection, nextState) {
			const self = this;
			
			const group = isString(selection)
				? document.querySelectorAll(selection)
				: selection;

			each(group, _ATTACH(eventName, function(event) {
				if (isFunction(nextState)) {
					self.applyState(nextState(event, self.state));
				} else {
					self.applyState(nextState);
				}
			}));
			return this;
		}
	}

	/********************************************************************/

	// Top-level object.
	const JState = new function(){};

	/**
	 * Creates a new application state driver.
	 * @param {Object} stateFuncMap a map of state member name to Function.
	 * 		The function is called if that state's member changes its value.
	 * 		First function parameter is the new value.
	 * 		Second function parameter is the previous value.
	 * @returns a new AppState object.
	 */
	JState.createAppState = function(stateFuncMap) {
		return new AppState(stateFuncMap);
	};

	/**
	 * Creates an object that reflects the ACTIVE input from changes to a form.
	 * If a tracked field in the provided Form element changes, the corresponding member in
	 * the returned object is changed, and the optional change function is called with the name of the member changed.
	 * @param {Element} formElements the Form element to bind.
	 * @param {object} targetObject (OPTIONAL) the object reference to bind to. If undefined or null, a new object is returned.
	 * @param {Function} changeFunc (OPTIONAL) the function to call on a field change. First parameter is the member name changed.
	 * @returns the object reference that will contain the object state.
	 */
	JState.bindFormState = function(formElements, targetObject, changeFunc) {
		
		if (isBlank(formElements)) {
			return;
		}

		const state = targetObject || {};
		const changeFunction = changeFunc;

		const CHECKBOXEVENT = (event) => {
			const element = event.srcElement;
			const memberName = element.getAttribute('name');
			if (!memberName) {
				return;
			}

			if (element.checked) {
				state[memberName] = element.value;
			}
			else {
				delete state[memberName];
			}
			changeFunction && changeFunction(memberName);
		};

		const TEXTEVENT = (event) => {
			const element = event.srcElement;
			const memberName = element.getAttribute('name');
			if (!memberName) {
				return;
			}

			state[memberName] = element.value;
			changeFunction && changeFunction(memberName);
		};

		const SELECTEVENT = (event) => {
			const element = event.srcElement;
			const memberName = element.getAttribute('name');
			if (!memberName) {
				return;
			}

			const multi = !!element.getAttribute('multiple');

			if (multi) {
				state[memberName] = [ ...element.options ].filter((option) => option.selected).map((option) => option.value);
			}
			else {
				state[memberName] = element.value;
			}
			changeFunction && changeFunction(memberName);
		};

		const TEXTCHANGE0 =	_ATTACH('change', TEXTEVENT);
		const TEXTCHANGE1 =	_ATTACH('keyup',  TEXTEVENT);
		const CHECKBOXCHANGE = _ATTACH('change', CHECKBOXEVENT);
		const SELECTCHANGE = _ATTACH('change', SELECTEVENT);

		for (let i = 0; i < formElements.length; i++) {
			const formElement = formElements[i];
			if (formElement.tagName === 'INPUT') {
				if (formElement.type === 'checkbox' || formElement.type === 'radio') {
					CHECKBOXCHANGE(formElement);
				}
				else if (formElement.type !== 'button' && formElement.type !== 'submit') {
					TEXTCHANGE0(formElement);
					TEXTCHANGE1(formElement);
				}
			}
			else if (formElement.tagName === 'TEXTAREA') {
				TEXTCHANGE0(formElement);
				TEXTCHANGE1(formElement);
			}
			else if (formElement.tagName === 'SELECT') {
				SELECTCHANGE(formElement);
			}
		}

		return state;
	};

	/********************************************************************/

	let old$JSAssignment = CTX.$JS;

	/**
	 * Restores the previous assigment of '$JS' at load.
	 */
	JState.noConflict = function() {
		CTX.$JS	 = old$JSAssignment;
	};
	
	CTX.JState = JState;
	CTX.$JS    = JState;

})(this);
