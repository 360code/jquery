// String to Object options format cache
// 缓存对象格式的标识
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
// 把字符串格式的标志转化成对象格式，并且保存到上面的缓存中
// 保存到缓存中可以避免重复的创建对象，而且，每次使用正则表达式也比较消耗性能
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.split( core_rspace ), function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
/*
 * 	使用不同的配置参数创建一个callback：
 * 
 * 	options支持传递多个参数，使用空格分开(如：$.Callbacks("once memory")，不同的参数，处理逻辑都会有区别
 *
 * 	默认不传参数，一个callback可以被fire多次 
 * 
 * 	其他几种参数（以下这些参数可组合使用，中间用空格分开）：
 *
 * 	once：        	确保一个callback只能被fire一次，跟Deferred一致
 * 
 * 	memory：      	在fire之后，在执行add操作，也是可以被触发
 *  
 * 	unique：      	add多个参数进来，如有重复，会被剔除
 *
 * 	stopOnFalse： 	当遇到某个add进来的函数执行之后的返回值为false，会停止后续的操作
 *
 *
 */

jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	// 把字符串的标志位转换成对象格式
	// (首先从缓存中取)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		// 记录上次fire的参数
		memory,
		// Flag to know if list was already fired
		// 是否已经fire的标志
		fired,
		// Flag to know if list is currently firing
		// 当前是否正在fire的标志
		firing,
		// First callback to fire (used internally by add and fireWith)
		// fire执行时list的起始位置(add内部调用，主要是提供memroy模式时候使用)
		firingStart,
		// End of the loop when firing
		// fire执行时list的结束位置
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		// fire执行时list的当前位置(remove时候可能被修改)
		firingIndex,
		// Actual callback list
		// 回调函数列表
		list = [],
		// Stack of fire calls for repeatable lists
		// fire调用的参数栈
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			// 在mermory模式下保存当前参数，否则为false，理解这个很重要，这里要跟line159关联起来看
			memory = options.memory && data;
			//已经fire
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			//正在fire
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				//stopOnFalse模式下，如果函数返回false，就break
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					// 在memory模式下，如果返回false，后续新增的回调也不在执行
					memory = false; // To prevent further calls using add
					break;
				}
			}
			//fire结束
			firing = false;
			if ( list ) {
				//如果不是once模式（关联line91，在once模式下，stack是为false），就从stack中取出下次fire的参数，并执行fireWith
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {//如果是once memory模式，只是清空旧的函数，后面新增的函数还是可以执行的
					list = [];
				} else {//如果是once模式，但不是memory模式，直接禁用整个callback
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		// 真正的callback对象
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					// 添加一个或多个函数到list
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" ) {
								if ( !options.unique || !self.has( arg ) ) {//如果当前模式是unique并且当前fn在已有list里面,则不添加
									list.push( arg );
								}
							} else if ( arg && arg.length && type !== "string" ) {//如果是数组,则递归
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					// 如果是正在执行的，修改fire循环的结束位置，保证这次新增的函数可以被执行
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					// 虽然不是正在执行状态，如果是memory模式，且没有被stopOnFalse阻止
					// 修改fire的起始位置，也就是再次fire，但是只执行新增的函数
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			// 从list中删除函数
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							// 移除函数
							list.splice( index, 1 );
							// Handle firing indexes
							// 如果是真在fire的，根据位置，修改firingLength或者firingIndex
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Control if a given callback is in the list
			// 函数是否在list中，unique模式下的add方法有用到
			has: function( fn ) {
				return jQuery.inArray( fn, list ) > -1;
			},
			// Remove all callbacks from the list
			// 清空list
			empty: function() {
				list = [];
				return this;
			},
			// Have the list do nothing anymore
			// 禁用list，once模式下fire方法里有用到
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			// 是否禁用
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			// 锁定，非memory下直接禁用，memory模式下，不再接收新的fire
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			// 是否被锁定
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			// 用所给的context和arguments执行全部的回调函数 
			fireWith: function( context, args ) {
				args = args || [];
				args = [ context, args.slice ? args.slice() : args ];
				// 还没有被fire过或者是memory模式
				if ( list && ( !fired || stack ) ) {
					//正在fire，就推入栈，等这次fire结束，会自动进行下次fire
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			// 调用fireWith，context是默认值（this）
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			// 是否fire过
			fired: function() {
				return !!fired;
			}
		};

	return self;
};
