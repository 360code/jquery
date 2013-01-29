//了解源码，要了解构造（实例化、原型链、原型链接续、继承机制），核心方法（init工厂方法）
var
	// 框架内部通用的jQuery(document)的临时变量
	rootjQuery,

	// 1.8中DOM ready改成了deferred，这个是ready的执行列表
	readyList,

	// 使用当前window下的document (沙箱机制)
	document = window.document,
	location = window.location,
	navigator = window.navigator,

	// 映射 jQuery 以便重写，主要是在noConflict中用到（line 342）
	_jQuery = window.jQuery,

	// 映射 $ 以便重写，主要是在noConflict中用到（line 342）
	_$ = window.$,

	// 一些核心方法的映射，1.8以后，核心变量的变量名也做了优化，前面加了core_前缀
	core_push = Array.prototype.push,
	core_slice = Array.prototype.slice,
	core_indexOf = Array.prototype.indexOf,
	core_toString = Object.prototype.toString,
	core_hasOwn = Object.prototype.hasOwnProperty,
	core_trim = String.prototype.trim,

	//注点1，这个对象准备被window.jQuery外放为jQuery全局变量，同时便于其它功能在其上扩展（如DOM，Event等）
	jQuery = function( selector, context ) {
		//注点1中调用时，自动构造jQuery对象，而这个jQuery对象，是jQuery.fn.init的一个实例化
		//故jQuery实例对象，前面都是没有new的，就是在这里框架内部自动完成了实例化
		return new jQuery.fn.init( selector, context, rootjQuery );
	},

	// Used for matching numbers
	core_pnum = /[\-+]?(?:\d*\.|)\d+(?:[eE][\-+]?\d+|)/.source,

	// Used for detecting and trimming whitespace
	core_rnotwhite = /\S/,
	core_rspace = /\s+/,

	// Make sure we trim BOM and NBSP (here's looking at you, Safari 5.0 and IE)
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	/*
	 * 第四个有趣的延伸知识点：正则表达式
	 * 
	 * @知识索引
	 * 正则表达式 http://www.cnblogs.com/deerchao/archive/2006/08/24/zhengzhe30fengzhongjiaocheng.html
	 */
	// 捕获1、html字符串（不能以#为前导，防止通过location.has进行xss攻击）；2、#开头的id字符串
	rquickExpr = /^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,
	
	// 匹配独立的html标签，标签闭合间没有文本，如<a>xxx</a>,中间有xxx不符合
	rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,

	// JSON转换用的正则表达式
	rvalidchars = /^[\],:{}\s]*$/,
	rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
	rvalidescape = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,
	rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d\d*\.|)\d+(?:[eE][\-+]?\d+|)/g,

	// 浏览器检测用正则表达式
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	//驼峰方法jQuery.camelCase中使用
	fcamelCase = function( all, letter ) {
		return ( letter + "" ).toUpperCase();
	},

	// The ready event handler and self cleanup method
	DOMContentLoaded = function() {
		if ( document.addEventListener ) {
			document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
			jQuery.ready();
		} else if ( document.readyState === "complete" ) {
			// we're here because readyState === "complete" in oldIE
			// which is good enough for us to call the dom ready!
			document.detachEvent( "onreadystatechange", DOMContentLoaded );
			jQuery.ready();
		}
	},

	// [[Class]] -> type pairs
	class2type = {};

/*
 * jQuery.fn相当于jQuery.prototype的别名，指向的是同一份内容
 * 第二个有趣的延伸知识点：js原型prototype
 * 
 * @知识索引：
 * 原型和继承：http://www.cnblogs.com/ljchow/archive/2010/06/08/1753526.html
 * prototype和constructor：http://blog.csdn.net/niuyongjie/article/details/4810835
 * 
 * @本处使用的作用
 * 主要是为了一些core方法的扩展准备（此处只做init核心方法的注释，其它方法请查看api结合源码了解）。
 * 注：按照prototype的概念，只有new jQuery的自身实例化能使用这里的方法，而jQuery对象，不是自身实例化，而是jQuery.fn.init的实例化，用不了这里的方法。
 *     有上面的问题，故有后面的原型链接续，使jQuery对象能使用这里的方法
 */
jQuery.fn = jQuery.prototype = {
	//构造器，便于内部使用this.constructor这种看起来超类继承的写法，更符合OOP思维
	constructor: jQuery,
	/*
	 * 
	 * 第三个有趣的延伸知识点：设计模式之工厂模式
	 * 
	 * @本处使用的作用
	 * 1）工厂模式的优点是一“家”工厂，解决各类生产需要，即一“个”jQuery对象，能分配各类调用需要
	 * 2）“单一”调用的写法，减少学习成本
	 * 3）jQuery不会因为不好预测使用者会给它传递什么参数，而导致自缚，便于后续扩展建立更多“子生产线”
	 * 4）使用者只需要关心在按照API要求使用情况下会得到期望结果，不需关心内部运作
	 * 
	 */
	init: function( selector, context, rootjQuery ) {
		var match, elem, ret, doc;
		// 根据selector不同，返回不同的值
		// selector有以下7种分支情况：
		// 1、""、null、undefined、false
		// 2、DOM元素
		// 3、body（优化寻找）1.7中还有，1.8没有，归到了4中，故这里源码没有
		// 4、字符串：HTML标签、HTML字符串、#id、选择器表达式
		// 5、函数（作为ready回调函数）
		// 6、jQuery对象（因为有selector值）
		// 7、其它
		
		// 分支1， $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// 分支2， $(DOMElement)
		if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;
		}

		// 分支3、4， HTML strings
		if ( typeof selector === "string" ) {
			// 前后<>匹配，根据html标签规律，<>开闭之间有个标签名，故长度至少是3，节省正则开销
			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
				// match是一个匹配用的变量数组，长度为3，html字符串则第2个有值，id字符串则第3个有值，故这里html字符串第2个有值
				match = [ null, selector, null ];

			} else {
				//正则表达式应用，匹配，子表达式1、html字符串（不能以#为前导，防止通过location.has进行xss攻击）；子表达式2、#开头的id字符串
				//用了exec，故匹配结果为[整体匹配结果，子表达式1匹配结果，子表达式2匹配结果]
				//如#id,匹配结果['#id',undefined,'id']，id字符串则第3个有值
				//如<div>,["<div>","<div>",undefined]，html字符串第2个有值，但这个结果会在上面分支中处理，不会进入这个分支
				//如a<div>,["a<div>","<div>",undefined]，html字符串第2个有值
				//如#id<div>，结果null，方式location.hash中的xss攻击？
				match = rquickExpr.exec( selector );
			}
			
			// match条件： 
			//1、selector为含<>闭合的合适字符串，即match[1]有值
			//2、id字符串，但context有一定限制("",null,undefined,false),类似$('#content','#doc')、$('#content',DOMElement)不符合，因为id唯一，后面加上，有点画蛇添足？;
			if ( match && (match[1] || !context) ) {

				// 分支: html标签字符串，$('<tag>')，这里排除了#id
				if ( match[1] ) {
					//instanceof判断context是否是jQuery对象，是的话，取jQuery对象第一个
					context = context instanceof jQuery ? context[0] : context;
					//context ("",null,undefined,false) doc=document
					//context (其它)，如果context.ownerDocument存在(隐含条件，context为DOM节点，且在文档中)，优先用这个，其次才是用context
					doc = ( context && context.nodeType ? context.ownerDocument || context : document );

					// 1.8中改进，将纯标签和html文本字符串两种情况，整合到了parseHTML方法中，1.7的话，实现还是在这块
					// 同时scripts暂定true，为后续兼容准备
					// parseHTML是转化html字符串为节点数组
					selector = jQuery.parseHTML( match[1], doc, true );
					
					//rsingleTag 如果是一个单一的标签（如<a></a>，中间没有html值，非<a>xxx</a>），且context是否纯对象，如果是，则作为新建标签的属性值
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						this.attr.call( selector, context, true );
					}
					//merge方法是两个数组合并，合到第一个数组
					return jQuery.merge( this, selector );

				// 分支: id字符串，$("#id")，这里id使用原生的方法，故context无需画蛇添足
				} else {
					elem = document.getElementById( match[2] );

					// 判断elem.parentNode，是为了黑莓4.6的取回的节点却不在document的特殊问题（#6963）
					if ( elem && elem.parentNode ) {
						// 判断getElementById返回结果，是否是id的值造成的。（IE和Opera下，name对getElementById也生效的问题）
						if ( elem.id !== match[2] ) {
							return rootjQuery.find( selector );
						}

						// 将结果注入jQuery对象中
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// 分支: context是("",null,undefined,false)，或者jQuery对象的情况下，使用find方法（selector是正确的css选择器，则返回能匹配的结果，如果不是，则返回空结果，具体逻辑在find中）
			} else if ( !context || context.jquery ) {
				//如果("",null,undefined,false)，则使用rootjQuery
				//如果是jQuery对象，则用context
				return ( context || rootjQuery ).find( selector );

			// 分支: $(expr, context)
			// 这里是context有值，且不为jQuery对象，所以要重新封装下
			// 即使用 $(context).find(expr)
			} else {
				//使this.constructor( context )即jQuery( context )
				return this.constructor( context ).find( selector );
			}

		// 分支: $(function)
		// domready简写
		} else if ( jQuery.isFunction( selector ) ) {
			return rootjQuery.ready( selector );
		}
		//如果内部是个jQuery对象，那么不用再次封装，直接简单加工下内部的jQuery对象
		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}
		//把一个像数组的对象（jQuery对象就是这种），处理成一个真实的数组
		return jQuery.makeArray( selector, this );
	},

	// jQuery会记录当前选择器，初始为空
	selector: "",

	// jQuery当前版本，这里的值是1.8.2，1.9以后，这块使用前面定义的变量
	jquery: "@VERSION",

	// jQuery对象的长度属性
	length: 0,

	// jQuery对象的长度方法
	size: function() {
		return this.length;
	},

	toArray: function() {
		return core_slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num == null ?

			// Return a 'clean' array
			this.toArray() :

			// Return just the object
			( num < 0 ? this[ this.length + num ] : this[ num ] );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems, name, selector ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		ret.context = this.context;

		if ( name === "find" ) {
			ret.selector = this.selector + ( this.selector ? " " : "" ) + selector;
		} else if ( name ) {
			ret.selector = this.selector + "." + name + "(" + selector + ")";
		}

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	ready: function( fn ) {
		// Add the callback
		jQuery.ready.promise().done( fn );

		return this;
	},

	eq: function( i ) {
		i = +i;
		return i === -1 ?
			this.slice( i ) :
			this.slice( i, i + 1 );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	slice: function() {
		return this.pushStack( core_slice.apply( this, arguments ),
			"slice", core_slice.call(arguments).join(",") );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: core_push,
	sort: [].sort,
	splice: [].splice
};

// 将jQuery对象的fn(即prototype)赋给实例化用的init函数的prototype，使得最后返回的jQuery对象的值拥有init中的this以及fn中的值
// 这里是框架中非常重要的一环
// 此处进行了原型链接续，原本，jQuery实例对象，因为它是jQuery.fn.init的实例化，故只能拥有init中的this以及自己的原型链（没有接续前是空）
// 这里这个操作，把jQuery的原型链（fn是原型链别名）接给了jQuery.fn.init，故最后的jQuery实例对象，拥有了init中的this以及自己的原型链（这时候接上了jQuery的原型链）
// 注意，后续被扩展在jQuery原型链上的，也会被jQuery实例对象拥有（如jQuery.extend等）
jQuery.fn.init.prototype = jQuery.fn;

//继承是面向对象中一种非常重要的概念，这里是jQuery的一个实现方案
//jQuery.extend为jQuery本体静态方法扩展入口，jQuery.fn.extend为jQuery实例扩展入口
//这里两种不能的继承基于同一个方法，但是却为后续框架两种扩展留下入口
jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		//target是传入的第一个值，表示需要应用继承的目标对象
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// 如果target是boolean（那明显不是需要应用继承的目标对象）
	if ( typeof target === "boolean" ) {
		//deep用传入值
		deep = target;
		//target用传入的第二个值，没有则空对象
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}
	// 如果target不是对象且不是函数，那么target是一个空对象{}
	// 可能是一个字符串或者其它(可能是一个深层拷贝)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}
	// 进入这个分支的只有1===1（第一个参数有值，且不是boolean）和2===2（第一个是boolean，第二个也有值）
	// 只有应用的目标对象，却无参考对象，奇怪？
	// 其实不奇怪，这里是jQuery自我继承用的
	if ( length === i ) {
		//target等于this，即该方法调用者，适应后面jQuery.extend({})的用法，即this为jQuery
		target = this;
		//自减，这样后面能进一次循环
		--i;
	}
	//从参数有效target之后，开始循环（不包括有效target，jQuery自调用时，有效target变为jQuery，原来的target变为参考对象）
	//参考对象可能是多个，故要一个个进行循环，故后面的参考对象，会重新覆盖前面的参考对象同名值
	for ( ; i < length; i++ ) {
		// 只处理非null和undefined
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// 防止无限循环的死锁，即参考对象中的值又指向目标对象，等于目标对象不停拷贝自己
				if ( target === copy ) {
					continue;
				}
				// 启用了deep深层拷贝，且copy非""、null、undefined、false且满足copy（数组或者纯对象）其中的一种情况
				// 深层拷贝数组、纯对象
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					//如果是数组
					if ( copyIsArray ) {
						//重置，使得下次进入时，还能启用外层判断
						copyIsArray = false;
						//判断目标对象中的原值是否是数组，如果是，克隆目标对象是原值，如果不是，则变为空数组
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						//判断目标对象中的原值是否是纯对象，如果是，克隆目标对象是原值，如果不是，则变为空的纯对象
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// 递归调用，深层拷贝
					target[ name ] = jQuery.extend( deep, clone, copy );

				// 非数组、非纯对象，且非null和undefined的其它情况（包括""、false等），这里简单数据结构，不需做深层拷贝，故deep不需要
				} else if ( copy !== undefined ) {
					//target中对象name的值更新为copy中的值
					target[ name ] = copy;
				}
			}
		}
	}

	// 返回修改后的对象
	return target;
};
//这里是扩展在jQuery本体的一些静态方法
jQuery.extend({
	//防止和其它框架冲突的方法，使用见api
	noConflict: function( deep ) {
		if ( window.$ === jQuery ) {
			window.$ = _$;
		}

		if ( deep && window.jQuery === jQuery ) {
			window.jQuery = _jQuery;
		}

		return jQuery;
	},

	// 判断DOM ready是否已经可用，如果已经ready，那么该值会变成true
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// DOM ready也是写在core里面的，1.8以后，这里改成了基于Deffered实现
	ready: function( wait ) {
		
		// Abort if there are pending holds or we're already ready
		// 如果已经ready 或者 等待状态，但不等于1（1自减1后等于0，即false，非1为true）
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// 确认body存在，为了防止IE下的自作聪明的先帮你完成了，故用了个计时器重新检测，直到body存在(ticket #5443).
		if ( !document.body ) {
			return setTimeout( jQuery.ready, 1 );
		}

		// 记录DOM 已经ready的状态
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.trigger ) {
			jQuery( document ).trigger("ready").off("ready");
		}
	},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray || function( obj ) {
		return jQuery.type(obj) === "array";
	},

	isWindow: function( obj ) {
		return obj != null && obj == obj.window;
	},

	isNumeric: function( obj ) {
		return !isNaN( parseFloat(obj) ) && isFinite( obj );
	},

	type: function( obj ) {
		return obj == null ?
			String( obj ) :
			class2type[ core_toString.call(obj) ] || "object";
	},

	isPlainObject: function( obj ) {
		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		try {
			// Not own constructor property must be Object
			if ( obj.constructor &&
				!core_hasOwn.call(obj, "constructor") &&
				!core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}
		} catch ( e ) {
			// IE8,9 Will throw exceptions on certain host objects #9897
			return false;
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.

		var key;
		for ( key in obj ) {}

		return key === undefined || core_hasOwn.call( obj, key );
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	error: function( msg ) {
		throw new Error( msg );
	},

	// data: string of html
	// context (optional): If specified, the fragment will be created in this context, defaults to document
	// scripts (optional): If true, will include scripts passed in the html string
	parseHTML: function( data, context, scripts ) {
		var parsed;
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		if ( typeof context === "boolean" ) {
			scripts = context;
			context = 0;
		}
		context = context || document;

		// Single tag
		if ( (parsed = rsingleTag.exec( data )) ) {
			return [ context.createElement( parsed[1] ) ];
		}

		parsed = jQuery.buildFragment( [ data ], context, scripts ? null : [] );
		return jQuery.merge( [],
			(parsed.cacheable ? jQuery.clone( parsed.fragment ) : parsed.fragment).childNodes );
	},

	parseJSON: function( data ) {
		if ( !data || typeof data !== "string") {
			return null;
		}

		// Make sure leading/trailing whitespace is removed (IE can't handle it)
		data = jQuery.trim( data );

		// Attempt to parse using the native JSON parser first
		if ( window.JSON && window.JSON.parse ) {
			return window.JSON.parse( data );
		}

		// Make sure the incoming data is actual JSON
		// Logic borrowed from http://json.org/json2.js
		if ( rvalidchars.test( data.replace( rvalidescape, "@" )
			.replace( rvalidtokens, "]" )
			.replace( rvalidbraces, "")) ) {

			return ( new Function( "return " + data ) )();

		}
		jQuery.error( "Invalid JSON: " + data );
	},

	// Cross-browser xml parsing
	parseXML: function( data ) {
		var xml, tmp;
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		try {
			if ( window.DOMParser ) { // Standard
				tmp = new DOMParser();
				xml = tmp.parseFromString( data , "text/xml" );
			} else { // IE
				xml = new ActiveXObject( "Microsoft.XMLDOM" );
				xml.async = "false";
				xml.loadXML( data );
			}
		} catch( e ) {
			xml = undefined;
		}
		if ( !xml || !xml.documentElement || xml.getElementsByTagName( "parsererror" ).length ) {
			jQuery.error( "Invalid XML: " + data );
		}
		return xml;
	},

	noop: function() {},

	// Evaluates a script in a global context
	// Workarounds based on findings by Jim Driscoll
	// http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
	globalEval: function( data ) {
		if ( data && core_rnotwhite.test( data ) ) {
			// We use execScript on Internet Explorer
			// We use an anonymous function so that context is window
			// rather than jQuery in Firefox
			( window.execScript || function( data ) {
				window[ "eval" ].call( window, data );
			} )( data );
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var name,
			i = 0,
			length = obj.length,
			isObj = length === undefined || jQuery.isFunction( obj );

		if ( args ) {
			if ( isObj ) {
				for ( name in obj ) {
					if ( callback.apply( obj[ name ], args ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.apply( obj[ i++ ], args ) === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isObj ) {
				for ( name in obj ) {
					if ( callback.call( obj[ name ], name, obj[ name ] ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.call( obj[ i ], i, obj[ i++ ] ) === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	// Use native String.trim function wherever possible
	trim: core_trim && !core_trim.call("\uFEFF\xA0") ?
		function( text ) {
			return text == null ?
				"" :
				core_trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				( text + "" ).replace( rtrim, "" );
		},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var type,
			ret = results || [];

		if ( arr != null ) {
			// The window, strings (and functions) also have 'length'
			// Tweaked logic slightly to handle Blackberry 4.7 RegExp issues #6930
			type = jQuery.type( arr );

			if ( arr.length == null || type === "string" || type === "function" || type === "regexp" || jQuery.isWindow( arr ) ) {
				core_push.call( ret, arr );
			} else {
				jQuery.merge( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		var len;

		if ( arr ) {
			if ( core_indexOf ) {
				return core_indexOf.call( arr, elem, i );
			}

			len = arr.length;
			i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

			for ( ; i < len; i++ ) {
				// Skip accessing in sparse arrays
				if ( i in arr && arr[ i ] === elem ) {
					return i;
				}
			}
		}

		return -1;
	},

	merge: function( first, second ) {
		var l = second.length,
			i = first.length,
			j = 0;

		if ( typeof l === "number" ) {
			for ( ; j < l; j++ ) {
				first[ i++ ] = second[ j ];
			}

		} else {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, inv ) {
		var retVal,
			ret = [],
			i = 0,
			length = elems.length;
		inv = !!inv;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			retVal = !!callback( elems[ i ], i );
			if ( inv !== retVal ) {
				ret.push( elems[ i ] );
			}
		}

		return ret;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value, key,
			ret = [],
			i = 0,
			length = elems.length,
			// jquery objects are treated as arrays
			isArray = elems instanceof jQuery || length !== undefined && typeof length === "number" && ( ( length > 0 && elems[ 0 ] && elems[ length -1 ] ) || length === 0 || jQuery.isArray( elems ) ) ;

		// Go through the array, translating each of the items to their
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}

		// Go through every key on the object,
		} else {
			for ( key in elems ) {
				value = callback( elems[ key ], key, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}
		}

		// Flatten any nested arrays
		return ret.concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = core_slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context, args.concat( core_slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	// Multifunctional method to get and set values of a collection
	// The value/s can optionally be executed if it's a function
	access: function( elems, fn, key, value, chainable, emptyGet, pass ) {
		var exec,
			bulk = key == null,
			i = 0,
			length = elems.length;

		// Sets many values
		if ( key && typeof key === "object" ) {
			for ( i in key ) {
				jQuery.access( elems, fn, i, key[i], 1, emptyGet, value );
			}
			chainable = 1;

		// Sets one value
		} else if ( value !== undefined ) {
			// Optionally, function values get executed if exec is true
			exec = pass === undefined && jQuery.isFunction( value );

			if ( bulk ) {
				// Bulk operations only iterate when executing function values
				if ( exec ) {
					exec = fn;
					fn = function( elem, key, value ) {
						return exec.call( jQuery( elem ), value );
					};

				// Otherwise they run against the entire set
				} else {
					fn.call( elems, value );
					fn = null;
				}
			}

			if ( fn ) {
				for (; i < length; i++ ) {
					fn( elems[i], key, exec ? value.call( elems[i], i, fn( elems[i], key ) ) : value, pass );
				}
			}

			chainable = 1;
		}

		return chainable ?
			elems :

			// Gets
			bulk ?
				fn.call( elems ) :
				length ? fn( elems[0], key ) : emptyGet;
	},

	now: function() {
		return ( new Date() ).getTime();
	}
});

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// we once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready, 1 );

		// Standards-based browsers support DOMContentLoaded
		} else if ( document.addEventListener ) {
			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", jQuery.ready, false );

		// If IE event model is used
		} else {
			// Ensure firing before onload, maybe late but safe also for iframes
			document.attachEvent( "onreadystatechange", DOMContentLoaded );

			// A fallback to window.onload, that will always work
			window.attachEvent( "onload", jQuery.ready );

			// If IE and not a frame
			// continually check to see if the document is ready
			var top = false;

			try {
				top = window.frameElement == null && document.documentElement;
			} catch(e) {}

			if ( top && top.doScroll ) {
				(function doScrollCheck() {
					if ( !jQuery.isReady ) {

						try {
							// Use the trick by Diego Perini
							// http://javascript.nwbox.com/IEContentLoaded/
							top.doScroll("left");
						} catch(e) {
							return setTimeout( doScrollCheck, 50 );
						}

						// and execute any waiting functions
						jQuery.ready();
					}
				})();
			}
		}
	}
	return readyList.promise( obj );
};

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

// All jQuery objects should point back to these
rootjQuery = jQuery(document);
// 后续代码列表
// 回调对象 Callback（line 985~1211)
// 延迟对象 Deferred（line 1214~1356)
// 浏览器特性检测 Support（line 1359~1662)
// 数据缓存 Data（line 1665~2030)
// 队列 queue（line 2033~2211)
// 属性操作 Attribute（line 2214~2868)
// 事件处理 Event（line 2871~3937)
// 选择器 Sizzle（line 3937~5394)
// DOM遍历 Traversing（line 5395~5716)
// DOM操作 Manipulation（line 5719~6550)
// CSS操作 （line 6553~6967)
// 异步请求 Ajax（line 6970~8358)
// 动画 FX（line 8361~9269)
// 坐标和可视窗口（line 9270~9379)
