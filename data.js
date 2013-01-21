var rbrace = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/,// 花括号或方括号
	rmultiDash = /([A-Z])/g;// 大写

jQuery.extend({
	cache: {},

	deletedIds: [],

	// Remove at next major release (1.9/2.0)
	uuid: 0,// 唯一id种子，DOM元素第一次调用data接口存储数据时，会用uuid++的方式，生成一个新的唯一id

	// 页面上jQuery副本的唯一标识
    // 非数字符号被移除以匹配rinlinejQuery
	expando: "jQuery" + ( jQuery.fn.jquery + Math.random() ).replace( /\D/g, "" ),

	 // The following elements throw uncatchable exceptions if you
    // attempt to add expando properties to them.
    //
    // YunG:
    // 如果尝试在embed、object、applet上附加属性值，将会抛出未捕获的异常
    //
    // embed：
    // embed标签用于播放一个多媒体对象，包括Flash、音频、视频等
    // http://221.199.150.103/jsj/html/page/book/xhtml/m_embed.htm
    //
    // object：
    // object元素用于向页面添加多媒体对象，包括Flash、音频、视频等。它规定了对象的数据和参数，以及可用来显示和操作数据的代码。
    // <object>与</object>之间的文本是替换文本，如果用户的浏览器不支持此标签会显示这些文本。
    // object元素中一般会包含<param>标签，<param>标签可用来定义播放参数。
    // http://221.199.150.103/jsj/html/page/book/xhtml/m_object.htm?F=14,L=1
    //
    // <embed>和<object>标签的区别：两者都是用来播放多媒体文件的对象，object元素用于IE浏览器，embed元素用于非IE浏览器，为了保证兼容性，通常我们同时使用两个元素，浏览器会自动忽略它不支持的标签。同时使用两个元素时，应该把<embed>标签放在<object>标签的内部。
    //
    // applet：
    // 不赞成使用
	noData: {
		"embed": true,
		// Ban all objects except for Flash (which handle expandos)
		"object": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",
		"applet": true
	},

	// 判断一个元素是否有与之关联的数据（通过jQuery.data设置），用在事件处理中
	// 如果是DOM元素，则从jQuery.cache中读取，关联jQuery.cache和DOM元素的id存储在属性jQuery.expando中
	// 如果是非DOM元素，则直接从elem上取，数据存储在 jQuery.expando 属性中
	// elem的属性jQuery.expando，要么值是id，要么值是要存储的数据
	// elem被替换为所存储的数据
	hasData: function( elem ) {
		elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];
		return !!elem && !isEmptyDataObject( elem );
	},
	 /**
     * jQuery.data( elem, key, value ) 在指定元素上存储/添加任意的数据，处理了循环引用和内存泄漏问题
     * jQuery.data( elem, key ) 返回指定元素上name指定的值
     * jQuery.data( elem ) 返回全部数据
     */
    /**
     * pvt 私有的，是否是内部使用的独立对象，pvt为true时用于事件处理
     */
	data: function( elem, name, data, pvt /* Internal Use Only */ ) {
		 // 是否可以附加数据，不可以则直接返回
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var thisCache, ret,
			internalKey = jQuery.expando,
			getByName = typeof name === "string",

			// We have to handle DOM nodes and JS objects differently because IE6-7
           // can't GC object references properly across the DOM-JS boundary
           // 必须区分处理DOM元素和JS对象，因为IE6-7不能垃圾回收对象跨DOM对象和JS对象进行的引用属性
			isNode = elem.nodeType,

			// Only DOM nodes need the global jQuery cache; JS object data is
			// attached directly to the object so GC can occur automatically
			// 如果是DOM元素，则使用全局的jQuery.cache（为什么？DOM元素不能存储非字符串？无法垃圾回收？）
           // 如果是JS对象，则直接附加到对象上
			cache = isNode ? jQuery.cache : elem,

			// Only defining an ID for JS objects if its cache already exists allows
			// the code to shortcut on the same path as a DOM node with no cache
			// 如果JS对象的cache已经存在，则需要为JS对象定义一个ID
           // 如果是DOM元素，则直接取elem[ jQuery.expando ]，返回id（有可能是undefined）
           // 如果是JS对象，且JS对象的属性jQuery.expando存在，返回jQuery.expando（有可能是 undefined）
			id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey;

		// Avoid doing any more work than we need to when trying to get data on an
		// object that has no data at all
		// 避免做更多的不必要工作，当尝试在一个没有任何数据的对象上获取数据时
		// name是字符串，data未定义，说明是在取数据
		// 但是对象没有任何数据，直接返回
		// ？id不存在，说明没有数据；或者，id存在，但是属性internalKey不存在，也说明没有数据
		// ？internalKey到底是干什么用的？
		if ( (!id || !cache[id] || (!pvt && !cache[id].data)) && getByName && data === undefined ) {
			return;
		}
		// id不存在的话就生成一个
		if ( !id ) {
			// Only DOM nodes need a new unique ID for each element since their data
			// ends up in the global cache
			// 只有DOM元素需要一个唯一ID，因为DOM元素的数据是存储在全局cache中的。
			// 用uuid种子递增分配唯一ID
			if ( isNode ) {
				elem[ internalKey ] = id = jQuery.deletedIds.pop() || jQuery.guid++;
			} else {
				 // JS对象则直接使用jQuery.expando，既然是直接附加到对象上，又何必要id呢？
				 // 避免与其他属性冲突！
				id = internalKey;
			}
		}

		// 数据存储在一个映射对象中({})
		if ( !cache[ id ] ) {
			cache[ id ] = {};

			// Avoids exposing jQuery metadata on plain JS objects when the object
			// is serialized using JSON.stringify
			if ( !isNode ) {
				cache[ id ].toJSON = jQuery.noop;
			}
		}

		// An object can be passed to jQuery.data instead of a key/value pair; this gets
		// shallow copied over onto the existing cache
		 // data接口接收对象和函数，浅拷贝
		if ( typeof name === "object" || typeof name === "function" ) {
			// 私有数据，存储在cache[ id ][ internalKey ]中
           // 什么类型的数据算私有数据呢？事件处理函数，还有么？
			if ( pvt ) {
				cache[ id ] = jQuery.extend( cache[ id ], name );
			} else {
				cache[ id ].data = jQuery.extend( cache[ id ].data, name );
			}
		}
		// 存储对象，存放了所有数据的映射对象
		thisCache = cache[ id ];

		// jQuery data() is stored in a separate object inside the object's internal data
		// cache in order to avoid key collisions between internal data and user-defined
		// data.
		// jQuery内部数据存在一个独立的对象（thisCache[ internalKey ]）上，为了避免内部数据和用户定义数据冲突
       //
       // 如果是私有数据
		if ( !pvt ) {
			// 存放私有数据的对象不存在，则创建一个{}
			if ( !thisCache.data ) {
				thisCache.data = {};
			}
			 // 使用私有数据对象替换thisCache
			thisCache = thisCache.data;
		}
		
		// 如果data不是undefined，表示传入了data参数，则存储data到name属性上
       // 这里的问题是：如果传入的是object/function，不做转换，只有传入的name是字符串才会转换。
		if ( data !== undefined ) {
			thisCache[ jQuery.camelCase( name ) ] = data;
		}

		// Check for both converted-to-camel and non-converted data property names
		// If a data property was specified
		if ( getByName ) {

			// First Try to find as-is property data
			ret = thisCache[ name ];

			// Test for null|undefined property data
			if ( ret == null ) {

				// Try to find the camelCased property
				ret = thisCache[ jQuery.camelCase( name ) ];
			}
		} else {
			ret = thisCache;
		}

		return ret;
	},

	// 在指定元素上移除存放的数据
	removeData: function( elem, name, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var thisCache, i, l,

			isNode = elem.nodeType,

			// See jQuery.data for more information
			cache = isNode ? jQuery.cache : elem,
			id = isNode ? elem[ jQuery.expando ] : jQuery.expando;

		// If there is already no cache entry for this object, there is no
		// purpose in continuing
		if ( !cache[ id ] ) {
			return;
		}

		if ( name ) {

			thisCache = pvt ? cache[ id ] : cache[ id ].data;

			if ( thisCache ) {

				// Support array or space separated string names for data keys
				if ( !jQuery.isArray( name ) ) {

					// try the string as a key before any manipulation
					if ( name in thisCache ) {
						name = [ name ];
					} else {

						// split the camel cased version by spaces unless a key with the spaces exists
						name = jQuery.camelCase( name );
						if ( name in thisCache ) {
							name = [ name ];
						} else {
							name = name.split(" ");
						}
					}
				}

				for ( i = 0, l = name.length; i < l; i++ ) {
					delete thisCache[ name[i] ];
				}

				// If there is no data left in the cache, we want to continue
				// and let the cache object itself get destroyed
				if ( !( pvt ? isEmptyDataObject : jQuery.isEmptyObject )( thisCache ) ) {
					return;
				}
			}
		}

		// See jQuery.data for more information
		if ( !pvt ) {
			delete cache[ id ].data;

			// Don't destroy the parent cache unless the internal data object
			// had been the only thing left in it
			if ( !isEmptyDataObject( cache[ id ] ) ) {
				return;
			}
		}

		// Destroy the cache
		if ( isNode ) {
			jQuery.cleanData( [ elem ], true );

		// Use delete when supported for expandos or `cache` is not a window per isWindow (#10080)
		} else if ( jQuery.support.deleteExpando || cache != cache.window ) {
			delete cache[ id ];
		// When all else fails, null
		} else {
			cache[ id ] = null;
		}
	},

	// For internal use only.
	// 内部使用
	_data: function( elem, name, data ) {
		return jQuery.data( elem, name, data, true );
	},

	// A method for determining if a DOM node can handle the data expando
	// 判断一个DOM元素是否可以附加数据
	acceptData: function( elem ) {
		var noData = elem.nodeName && jQuery.noData[ elem.nodeName.toLowerCase() ];

		// nodes accept data unless otherwise specified; rejection can be conditional
		return !noData || noData !== true && elem.getAttribute("classid") === noData;
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var parts, part, attr, name, l,
			//取匹配元素的第一个DOM对象
			elem = this[0],
			i = 0,
			data = null;
		// 守护方法，用于处理特殊的key
       // key是undefined，则认为是取当前jQuery对象中第一个元素的全部数据
		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = jQuery.data( elem );

				if ( elem.nodeType === 1 && !jQuery._data( elem, "parsedAttrs" ) ) {
					attr = elem.attributes;
					for ( l = attr.length; i < l; i++ ) {
						name = attr[i].name;

						if ( !name.indexOf( "data-" ) ) {
							name = jQuery.camelCase( name.substring(5) );

							dataAttr( elem, name, data[ name ] );
						}
					}
					jQuery._data( elem, "parsedAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		// key是对象，则对当前jQuery对象迭代调用$.fn.each，
		// 在每一个匹配的元素上存储数据key
		if ( typeof key === "object" ) {
			return this.each(function() {
				jQuery.data( this, key );
			});
		}
		// 到这列，key是字符串
		parts = key.split( ".", 2 );
		parts[1] = parts[1] ? "." + parts[1] : "";
		part = parts[1] + "!";

		return jQuery.access( this, function( value ) {
			 // 如果value为undefined，则任务是取当前jQuery对象中第一个元素指定名称的数据
			if ( value === undefined ) {
				data = this.triggerHandler( "getData" + part, [ parts[0] ] );

				// Try to fetch any internally stored data first
				// 优先取内部数据
				if ( data === undefined && elem ) {
					data = jQuery.data( elem, key );
					// 读取HTML5的data属性
					data = dataAttr( elem, key, data );
				}

				return data === undefined && parts[1] ?
					this.data( parts[0] ) :
					data;
			}
			 // key是字符串，value不是undefined，则存储
			parts[1] = value;
			this.each(function() {
				var self = jQuery( this );
				// 触发事件
				self.triggerHandler( "setData" + part, parts );
				jQuery.data( this, key, value );
				self.triggerHandler( "changeData" + part, parts );
			});
		}, null, value, arguments.length > 1, null, false );
	},

	removeData: function( key ) {
		return this.each(function() {
			jQuery.removeData( this, key );
		});
	}
});

//支持HTML5的data- 属性
// HTML 5 data- Attributes http://ejohn.org/blog/html-5-data-attributes/
function dataAttr( elem, key, data ) {
	// 如果在指定元素elem没有找到key对应的数据data，就尝试读取HTML5的data属性
	if ( data === undefined && elem.nodeType === 1 ) {

		var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
				data === "false" ? false :
				data === "null" ? null :
				// Only convert to a number if it doesn't change the string
				+data + "" === data ? +data :
				rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			jQuery.data( elem, key, data );

		} else {
			data = undefined;
		}
	}

	return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
	var name;
	for ( name in obj ) {

		// if the public data object is empty, the private is still empty
		if ( name === "data" && jQuery.isEmptyObject( obj[name] ) ) {
			continue;
		}
		if ( name !== "toJSON" ) {
			return false;
		}
	}

	return true;
}

