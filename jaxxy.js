/****************************************************************************
 * Jaxxy by Matt Tropiano (C) 2022
 * Requires ECMAScript 6
 * Licensed for use under the MIT License
 * @license
 ****************************************************************************/
(function(CTX){
	
	/********************************************************************/
	/** Test Browser Capabilities                                      **/
	/********************************************************************/

	if (!CTX.DOMParser) {
		console.error("Missing required object: DOMParser.");
		return;
	}
	if (!encodeURIComponent) {
		console.error("Missing required function: encodeURIComponent.");
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
	/** Classes                                                        **/
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
	const Jaxxy = new function(param) {
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
		else {
			options = {
				"method": 'GET', 
				"url": toString(param)
			};
		}
		
		if (!options.method) {
			options.method = 'GET';
		}
		else {
			options.method = options.method.toUpperCase();
		}
		
		options.url = options.url || '#';
		
		const opt = { ...AJAX_OPTIONS_DEFAULTS, ...options };

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
			"headers": {
				"Accept": 'application/json',
				...headers
			},
			"url": url,
			"data": data,
			"dataType": 'json',
			"responseType": 'json'	
		});
	};

	const $ajaxTextHandler = function(responseContent) {
		if (!isString(responseContent)) {
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
	 * Adds/sets an AJAX response type handler.
	 * The handled type is either the name of an expected type passed to options,
	 * or the MIME-Type of the response body.
	 * @param {string} handledTypeName the name of type.
	 * @param {Function} func the handler function.
	 */
	Jaxxy.extendAJAX = function(handledTypeName, func) {
		if (AJAXCall.prototype.responseTypeHandlers[handledTypeName]) {
			console.warn('Jaxxy: Overriding existing handler type: ' + handledTypeName);
		}	
		AJAXCall.prototype.responseTypeHandlers[handledTypeName] = func;
	};

	/********************************************************************/

	Jaxxy.extendAJAX('text', $ajaxTextHandler);
	Jaxxy.extendAJAX('text/plain', $ajaxTextHandler);

	Jaxxy.extendAJAX('json', $ajaxJSONHandler);
	Jaxxy.extendAJAX('application/json', $ajaxJSONHandler);

	Jaxxy.extendAJAX('xml', $ajaxXMLHandler);
	Jaxxy.extendAJAX('text/xml', $ajaxXMLHandler);
	Jaxxy.extendAJAX('application/xml', $ajaxXMLHandler);
	Jaxxy.extendAJAX('html', $ajaxXMLHandler);
	Jaxxy.extendAJAX('text/html', $ajaxXMLHandler);
	Jaxxy.extendAJAX('xhtml', $ajaxXMLHandler);
	Jaxxy.extendAJAX('text/xhtml', $ajaxXMLHandler);
	
	Jaxxy.each = each;
	Jaxxy.queryString = queryString;

	Jaxxy.isType = isType;
	Jaxxy.isUndefined = isUndefined;
	Jaxxy.isNull = isNull;
	Jaxxy.isBoolean = isBoolean;
	Jaxxy.isNumber = isNumber;
	Jaxxy.isString = isString;
	Jaxxy.isArray = isArray;
	Jaxxy.isFunction = isFunction;
	Jaxxy.isObject = isObject;
	Jaxxy.isBlank = isBlank;

	Jaxxy.JSON =        $jsonAjax;
	Jaxxy.JSON.get =    function(url, headers)       { return $jsonAjax('get', url, null, headers); };
	Jaxxy.JSON.delete = function(url, headers)       { return $jsonAjax('delete', url, null, headers); };
	Jaxxy.JSON.put =    function(url, data, headers) { return $jsonAjax('put', url, data, headers); };
	Jaxxy.JSON.post =   function(url, data, headers) { return $jsonAjax('post', url, data, headers); };
	Jaxxy.JSON.patch =  function(url, data, headers) { return $jsonAjax('patch', url, data, headers); };

	/********************************************************************/

	let old$JXAssignment     = CTX.$JX;
	let old$JXJAssignment    = CTX.$JXJ;

	/**
	 * Restores the previous assigment of '$JX' and '$JXJ' at load.
	 */
	Jaxxy.noConflict = function() {
		CTX.$JX     = old$JXAssignment;
		CTX.$JXJ    = old$JXJAssignment;
	};
	
	CTX.Jaxxy = Jaxxy;
	CTX.$JX   = Jaxxy;
	CTX.$JXJ  = Jaxxy.JSON;

})(this);
