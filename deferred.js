jQuery.extend({
	// jQuer 1.5版本引入Deferred功能, 为处理事件回调提供了更加强大而灵活的编程模型. 
	// 目前在jQuery.ajax支持deferred这种用法
	// jQuery.Deferred()背后的设计理念来自CommonJS Promises/A , jQuery.Deferred()基于这个理念实现，但并没有完全遵循其设计。其它语言或者框架，例如python和dojo中都有类似的实现。 
	// 一、什么是deferred对象？
    // 开发网站的过程中，我们经常遇到某些耗时很长的javascript操作。其中，既有异步的操作（比如ajax读取服务器数据），也有同步的操作（比如遍历一个大型数组），它们都不是立即能得到结果的。
    // 通常的做法是，为它们指定回调函数（callback）。即事先规定，一旦它们运行结束，应该调用哪些函数。
    // 但是，在回调函数方面，jQuery的功能非常弱。为了改变这一点，jQuery开发团队就设计了deferred对象。
    // 简单说，deferred对象就是jQuery的回调函数解决方案。在英语中，defer的意思是"延迟"，所以deferred对象的含义就是"延迟"到未来某个点再执行。
    // 它解决了如何处理耗时操作的问题，对那些操作提供了更好的控制，以及统一的编程接口。
	// DEMO:http://jsfiddle.net/xcgfly2sky/N5vkk/
	Deferred: function( func ) {
		var tuples = [
				// 数据元组集
				// 每个元组分别包含一些与当前deferred相关的信息:
				// 分别是：触发回调函数列表执行(函数名)，添加回调函数（函数名），回调函数列表（jQuery.Callbacks对象,这样变支持链式操作.done(function(){}).done(function(){})），deferred最终状态（第三组数据除外）
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			//deferred的状态，分为三种：pending(初始状态), resolved(解决状态), rejected(拒绝状态)
			state = "pending",
			// promise对象，主要有两点作用：
			// 1. 在初始化deferred对象时，promise对象里的方法都会被extend到deferred中去，作为引用（见86行）
			// 2. 那么，生成的deferred对象里必然引用了promise对象的promise方法，所以当调用deferred.promise()时，
			//    deferred对象会通过闭包返回promise对象，这就是所谓的受限制的deferred对象（用deferred2表示），因为相比之前，
			//    返回的deferred2不在拥有resolve(With), reject(With), notify(With)这些能改变deferred对象状态并且执行callbacklist的方法了
			promise = {
				// 返回闭包里的内部state（外部只读）
				state: function() {
					return state;
				},
				// 同时在doneList和failList的list里添加回调函数（引用）
				// 那么不论deferred最终状态是resolved还是rejected, 回调函数都会被执行，这就是所谓的always
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				// jQuery.then()会创建一个新的受限制的deferred对象(返回的是deferred.promise())
				// DEMO:http://jsfiddle.net/xcgfly2sky/gsqbE/1/
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var action = tuple[ 0 ],
								fn = fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							// 分别为deferred的三个callbackList添加回调函数
							// 根据传入的参数是否未函数，分为两种情况
							// 1.是函数的情况，根据返回值(称作returnReferred)是否是deferred对象，又可以分为两种情况
							// 1.1 返回值是deferred对象，那么在returned对象的三个回调函数列表中添加newDeferred的resolve(reject,notify)方法
							// newDeferrred的执行依赖returned的状态
							// 1.2 返回值不是deferred对象，那么将返回值returned作为newDeferred的参数并将从外层deferred那边的上下文环境作为newDeferred
							// 的执行上下文，然后执行对应的回调函数列表，此时newDeferrred的执行依赖外层的调用者deferred的状态
							// 2.不是函数情况，如值为undefined或者null等），直接链接到newDeferred的resolve(reject,notify)方法，也就是说
							// newDeferrred的执行依赖外层的调用者deferred的状态或者说是执行动作（resolve还是reject或者是notify）
							// 此时deferred.then()相当于将自己的callbacklist和newDeferred的callbacklist连接起来了，故可以在newDeferred
							deferred[ tuple[1] ]( jQuery.isFunction( fn ) ?
								function() {
									var returned = fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise()
											.done( newDefer.resolve )
											.fail( newDefer.reject )
											.progress( newDefer.notify );
									} else {
										newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
									}
								} :
								newDefer[ action ]
							);
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			// 实际返回的deferred对象
			deferred = {};

		// Keep pipe for back-compat
		// pipe和then引用同一个函数，所以功能是一样的
		// 只不过通常的用法是：会用pipe进行filter操作
		// 这里的实现和1.7.2版本不一样

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// 通过上面定义的数据元组集来扩展方法
		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add

			// 给当面定义的promise对象添加done,fail,progress方法
			// 这个三个方法分别引用不同jQuery.Callbacks对象的add方法
			// 那么这个三个方法的用途就是向各自列表添加回掉函数，互不干扰
			promise[ tuple[1] ] = list.add;

			// Handle state
			// 通过stateString有值这个条件。预先向doneList，failList中的list添加三个回调函数
			// doneList:[changeState,failList.disable,progressList.lock]
			// faileList:[changeState,doneList.disable,progressLisr.lock]
			// changeSate指的是下面首先添加的一个改变deferred对象的匿名函数
			// 可以看出：不论deferred对象最终是resolve（还是reject），在首先改变状态之后，都会disbable另一个函数列表failList（或者doneList）
			// 然后lock progressList保持其状态，最后执行剩下的之前的done或者fail进来的回调函数
			// 除progressList之外
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ] = list.fire
			// 给deferred对象添加resolve(With),reject(With),notify(With)方法
			// 这三个方法分别引用三个不同jQuery.Callbacks对象的fire方法（不是同一个引用）
			// 那么这三个方法的用途就是执行各自的回调函数列表，互不干扰
			deferred[ tuple[0] ] = list.fire;
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		// 将上面的promise对象extend进deferred
		promise.promise( deferred );

		// Call given func if any
		// 如果调用jQuery.Deferred(func)指定了参数，那么设置该函数的上下文和参数都为deferred
		// jQuery.then用用到这一点
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		// 返回最终的deferred对象
		return deferred;
	},

	// DEMO:http://jsfiddle.net/xcgfly2sky/P2GkC/2/
	// Deferred helper
	// 参数：一个（或多个）deferred对象（或其他）
	// 当传入的所有deferred对象都resolve或者reject了，执行when()创建的deferred对象（称之为whenDeferred）对应的回调函数列表（非deferred对象被认为是resolve了）
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			// 首先将arguments伪数组转换为真正的数组
			resolveValues = core_slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			// jQuery.isFunction( subordinate.promise )用来判断subordinate是否是deferred对象
			// 1. 在参数个数等于1的情况下：
			//   1.1 如果参数是deferred对象，那么remaining = length, 这是remaining就是1嘛             
			//   1.2 否则remaining为0
            // 2. 在参数不等于1(即等于0或者大于1)的情况：remaining = length
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			// 如果参数个数仅为1个，并且是deferred对象，那么就无需再生成deferred对象
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				// 这里返回一个函数作为一个callback完全是为了创建一个闭包，主要是为了保持i的值
				return function( value ) {
					// 保存各个deferred执行的上下文，也就是说之后whenDeferred的回调函数的上下文就是一个数组
					contexts[ i ] = this;
					// 保存各个deferred执行时的参数，之后传递给whenDeferred的回调函数
					// 此时values的值有原先的jQuery.when()传进来的参数变为各个deferred执行回调时的参数了，也就是说覆盖了
					values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
					if( values === progressValues ) {
						// 触发progressList上的回调函数
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) { //即所有延迟都resolve，执行whenDeferred的回调函数
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		// 如果参数个数大于1，那么就是说有可能存在多个deferred对象 
		// 这时需要一些条件判断以保证是所有的deferred对象都resolve了，再执行whenDeferred的resolve
        // 或者当有一个deferred对象reject了，whenDeferred的reject 见192行
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				// 如果是deferred对象
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					// 给每个参数（deferred对象）添加最后的回调，用来检查此时的状态
					resolveValues[ i ].promise()
					// 用于当每一个deferred对象resolve回来，用updateFunc返回的函数检查此时其他deferred对象的状态（即此时remaining是否等于0了）
					// 如果等于0，则执行whenDeferred的resolve，否则继续等待
						.done( updateFunc( i, resolveContexts, resolveValues ) )
					//如果有一个deferred对象reject,whenDeferred将执行reject
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				// 如果不是deferred对象，直接--remaining，视为resolve
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		// 如果此时remaining就等与0了，表示没有什么延迟需要等待，那么立即之行whenDeferred的resolveWith
		// 此时resolveContexts为undefined， 这就意味这上下文将为全局的window
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});
